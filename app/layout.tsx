import type { Metadata } from "next";
import { Noto_Sans_Hebrew, Geist_Mono } from "next/font/google";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import "./globals.css";

const notoSansHebrew = Noto_Sans_Hebrew({
  variable: "--font-sans",
  subsets: ["hebrew"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "המשבצת",
  description: "שיבוץ כוח אדם ומשמרות",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${notoSansHebrew.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DirectionProvider direction="rtl">{children}</DirectionProvider>
      </body>
    </html>
  );
}
