import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Fish Small Fish Workspace",
  description:
    "Research targets, inspect evidence, rank opportunities, and generate reviewable drafts from the backend workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
