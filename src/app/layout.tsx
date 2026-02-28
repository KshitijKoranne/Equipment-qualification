import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Equipment Qualification | QA System",
  description: "Pharmaceutical equipment qualification tracking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('eq-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
