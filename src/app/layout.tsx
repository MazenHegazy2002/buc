import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FolderTree, { type TreeSemester } from "@/components/FolderTree";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){document.documentElement.dataset.theme="light"}`;

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "BUC Med — Lectures, Summaries & Exams", template: "%s · BUC Med" },
  description:
    "Every semester, subject and lesson in one place: lecture & CPL PDFs, AI summaries, mind maps, video lessons, 30 MCQs and 30 clinical cases per lesson.",
};

async function loadTree(): Promise<TreeSemester[]> {
  await connection();
  try {
    return await prisma.semester.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true, title: true,
        subjects: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = await loadTree();
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" id="nav-home">
              <span className="brand-mark">B</span>
              <div className="brand-text">
                <span className="brand-title">BUC Med</span>
                <span className="brand-sub">Powered by Brandyy</span>
              </div>
            </Link>
            <div className="header-actions">
              <span className="header-meta">Auto-synced daily at 8:00 PM</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="shell">
          <FolderTree tree={tree} />
          <main className="content">{children}</main>
        </div>
        <footer className="footer">
          <div className="container">Content synced from Google Drive · AI-generated material may contain errors, verify with your lectures.</div>
        </footer>
      </body>
    </html>
  );
}
