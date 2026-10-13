import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "BUC Med — Lectures, Summaries & Exams", template: "%s · BUC Med" },
  description:
    "Every semester, subject and lesson in one place: lecture & CPL PDFs, AI summaries, mind maps, video lessons, 30 MCQs and 30 clinical cases per lesson.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" id="nav-home">
              <span className="brand-mark">B</span>
              BUC Med
            </Link>
            <span className="header-meta">Auto-synced daily at 8:00 PM</span>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <div className="container">Content synced from Google Drive · AI-generated material may contain errors, verify with your lectures.</div>
        </footer>
      </body>
    </html>
  );
}
