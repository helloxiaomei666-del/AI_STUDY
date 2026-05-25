import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智习管家",
  description: "AI自习室错题诊断与学习反馈系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
