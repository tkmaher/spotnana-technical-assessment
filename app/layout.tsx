import type { Metadata } from "next";
import "./globals.scss";

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "NormalChat",
  description: "Chat with AI!",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` ${inter.className} h-full antialiased`}
    >
      <body id="body-flex">
        {children}
      </body>
    </html>
  );
}
