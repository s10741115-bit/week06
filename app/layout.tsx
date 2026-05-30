import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galaga Space Shooter | 復古街機小蜜蜂太空射擊遊戲",
  description: "使用 Next.js 與 HTML5 Canvas 技術重製的 60fps 街機小蜜蜂 (Galaga) 射擊遊戲！支援手動登錄分數與即時排行榜！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
