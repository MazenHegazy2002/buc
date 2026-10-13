import { google, drive_v3 } from "googleapis";

const FOLDER = "application/vnd.google-apps.folder";
const SHORTCUT = "application/vnd.google-apps.shortcut";

/** Google-native types we can export to PDF for the AI + download. */
export const EXPORTABLE: Record<string, string> = {
  "application/vnd.google-apps.document": "application/pdf",
  "application/vnd.google-apps.presentation": "application/pdf",
  "application/vnd.google-apps.spreadsheet": "application/pdf",
};

let cached: drive_v3.Drive | null = null;

export function getDrive(): drive_v3.Drive {
  if (cached) return cached;
  let credentials: any = undefined;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      credentials = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof credentials === "string") credentials = JSON.parse(credentials);
    } catch {
      // If it fails to parse as string, check if it is a file path
      const fs = require("fs");
      if (fs.existsSync(raw)) {
        credentials = JSON.parse(fs.readFileSync(raw, "utf8"));
      }
    }
  }
  if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };
  }
  if (!credentials) {
    const fs = require("fs");
    if (fs.existsSync("buclms-0bff9f3f9936.json")) {
      credentials = JSON.parse(fs.readFileSync("buclms-0bff9f3f9936.json", "utf8"));
    }
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  cached = google.drive({ version: "v3", auth });
  return cached;
}

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: number;
  webViewLink?: string;
};

/** List all direct children (handles pagination + resolves shortcuts). */
export async function listChildren(folderId: string): Promise<DriveItem[]> {
  const drive = getDrive();
  const out: DriveItem[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, shortcutDetails)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      const isShortcut = f.mimeType === SHORTCUT && f.shortcutDetails?.targetId;
      out.push({
        id: isShortcut ? f.shortcutDetails!.targetId! : f.id!,
        name: f.name!,
        mimeType: isShortcut ? f.shortcutDetails!.targetMimeType! : f.mimeType!,
        modifiedTime: f.modifiedTime!,
        size: f.size ? Number(f.size) : undefined,
        webViewLink: f.webViewLink ?? undefined,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export const isFolder = (i: DriveItem) => i.mimeType === FOLDER;

/** All files under a folder, recursing into sub-folders (e.g. "CPL/", "Lecture/"). */
export async function listFilesDeep(
  folderId: string,
  path: string[] = [],
): Promise<(DriveItem & { path: string[] })[]> {
  const items = await listChildren(folderId);
  const files: (DriveItem & { path: string[] })[] = [];
  for (const it of items) {
    if (isFolder(it)) files.push(...(await listFilesDeep(it.id, [...path, it.name])));
    else files.push({ ...it, path });
  }
  return files;
}

/** Download a file as a Buffer, exporting Google Docs/Slides to PDF. */
export async function downloadFile(id: string, mimeType: string): Promise<{ data: Buffer; mimeType: string }> {
  const drive = getDrive();
  if (EXPORTABLE[mimeType]) {
    const res = await drive.files.export(
      { fileId: id, mimeType: EXPORTABLE[mimeType] },
      { responseType: "arraybuffer" },
    );
    return { data: Buffer.from(res.data as ArrayBuffer), mimeType: EXPORTABLE[mimeType] };
  }
  const res = await drive.files.get(
    { fileId: id, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  return { data: Buffer.from(res.data as ArrayBuffer), mimeType };
}

/** Natural sort so "Lesson 2" < "Lesson 10" and "1.Sem6" < "2.Sem 7". */
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
