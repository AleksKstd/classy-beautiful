import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Запази час онлайн",
  description:
    "Запазете час онлайн в салон за красота Classy & Beautiful: изберете салон в София или Лом, процедура, дата и час. Потвърждение по имейл.",
  path: "/rezervacii",
});

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
