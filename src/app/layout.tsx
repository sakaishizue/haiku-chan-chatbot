import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ハイクちゃんとおしゃべり",
  description: "中学生の女の子「ハイクちゃん」とおしゃべりできる雑談チャットボット",
  icons: { icon: "/haiku-chan.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2f4a6d",
  // スマホのキーボードが開いたら画面を縮め、入力欄が隠れないようにする
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
