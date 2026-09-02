import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mycelium — Grow a map of any idea",
  description:
    "An interactive AI knowledge explorer. Type any topic and watch it bloom into a living map of connected ideas.",
};

export const viewport: Viewport = {
  themeColor: "#080c0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('mycelium-theme');
    if (t === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
