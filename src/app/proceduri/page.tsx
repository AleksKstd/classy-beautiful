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
      <section className="pt-12 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-black mb-3">
              Нашите процедури
            </h1>
            <p className="text-gray-500">
              Открийте широката гама от професионални процедури за красота
            </p>
            <div className="h-1 w-20 bg-gold mt-4" />
          </div>
        </div>
      </section>

      {/* Procedures Grid */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ProceduresGrid procedures={procedures} />
        </div>
      </section>
    </div>
  );
}
