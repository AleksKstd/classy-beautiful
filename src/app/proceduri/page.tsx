import type { Metadata } from "next";
import { ProceduresGrid } from "@/components/procedures-grid";
import { getActiveProcedures } from "@/lib/data/procedures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Процедури и цени",
  description:
    "Всички процедури на Classy & Beautiful с цени и продължителност - нокти, мигли и вежди, терапии за лице, лазерна епилация и кола маска.",
  alternates: { canonical: "/proceduri" },
};

export default async function ProceduresPage() {
  const procedures = await getActiveProcedures();

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header */}
      <section className="relative overflow-hidden pt-16 pb-12 mb-10 bg-gradient-to-b from-blush-light via-ivory to-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-champagne blur-3xl" />
        <div aria-hidden="true" className="drop-dots pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem]" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4">Ценоразпис</p>
            <h1 className="text-5xl sm:text-6xl text-brand-black mb-4">Нашите процедури</h1>
            <p className="text-gray-600 leading-relaxed">
              Цени и продължителност на всички процедури. Изберете процедура, за да запазите час.
            </p>
          </div>
        </div>
      </section>

      {/* Procedures Grid */}
      <section className="pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ProceduresGrid procedures={procedures} />
        </div>
      </section>
    </div>
  );
}
