import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Source_Sans_3, Syne } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
});

const display = Syne({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-syne",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — günün haberleri`,
    template: `%s · ${APP_NAME}`,
  },
  description: "Günün haberleri, saate göre. Başlık, özet, görsel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
