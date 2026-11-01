import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ハイクちゃん",
  description: "中学生の女の子「ハイクちゃん」とおしゃべりできる雑談チャットボット",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
