import "./globals.css";
import { ReactNode } from "react";
import HydratedMarker from "./hydrated";

export const metadata = {
  title: "Signet Protocol Console",
  description: "Trust Fabric for AI-to-AI Communications"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <HydratedMarker />
        <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
