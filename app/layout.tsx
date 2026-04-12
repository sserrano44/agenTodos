import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Agent Todos",
  description: "Shared todo workspace for admins and remote agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-[var(--font-sans)] antialiased">{children}</body>
    </html>
  );
}
