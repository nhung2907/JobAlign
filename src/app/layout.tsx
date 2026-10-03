import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JobAlign — Định vị năng lực & khớp đãi ngộ hai chiều", template: "%s · JobAlign" },
  description:
    "Đánh giá hai chiều giữa CV và JD: bạn có hợp với công việc, và công việc có hợp với kỳ vọng của bạn. Phân biệt năng lực chưa thể hiện trên CV với năng lực thực sự còn thiếu.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
