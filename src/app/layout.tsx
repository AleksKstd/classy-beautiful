import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Classy & Beautiful - Елегантен салон за красота",
  description:
    "CB Classy & Beautiful предлага подбрани процедури за коса, лице и тяло. Резервирайте вашия час онлайн.",
  keywords: [
    "салон за красота",
    "козметичен салон",
    "София",
    "Лом",
    "маникюр",
    "педикюр",
    "лазерна епилация",
    "мигли",
    "вежди",
  ],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
