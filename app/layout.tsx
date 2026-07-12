import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Critter Keepers — Guardians of the Heart Tree",
  description: "Collect adorable woodland guardians and defend the Heart Tree in this cozy tower defence adventure.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
