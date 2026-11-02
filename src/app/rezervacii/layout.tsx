import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Запази час",
  description:
    "Резервирайте час онлайн в Classy & Beautiful - изберете салон в София или Лом, процедура, дата и час.",
  alternates: { canonical: "/rezervacii" },
};

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
