import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Chinese Lunar Calendar for Todoist",
  description: "Generate lunar recurring events as Todoist tasks",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
