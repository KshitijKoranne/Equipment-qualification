import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Equipment Qualification | QA System",
  description: "Pharmaceutical equipment qualification tracking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
