import type { Metadata } from "next";
import { Suspense } from "react";
import SiteShell from "./site-shell";
import { SettingsProvider } from "./settings-context";
import "./globals.css";
import "./fonts.css";
export const metadata: Metadata = {
  title: "Төрсөн өдрийн урилга | Хамтдаа тэмдэглэе",
  description: "Онцгой өдрийг хамтдаа тэмдэглэе. Урилгаа үзэж, хүрэлцэн ирэх эсэхээ сонгоорой.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="mn"><body><SettingsProvider><Suspense fallback={null}><SiteShell>{children}</SiteShell></Suspense></SettingsProvider></body></html>;
}
