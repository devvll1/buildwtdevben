import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iloilo Outdoor Comfort Finder | Maayong Pag-abot",
  description:
    "A friendly Ilonggo guide to outdoor spots in Iloilo City, with a forecast to help you plan a comfortable visit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
