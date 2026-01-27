import { createClient } from "@/lib/supabase/server";
import { ProceduresGrid } from "@/components/procedures-grid";

export default async function ProceduresPage() {
  const supabase = await createClient();

  const { data: procedures } = await supabase
    .from("procedures")
    .select("*")
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

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
          <ProceduresGrid procedures={procedures || []} />
        </div>
      </section>
    </div>
  );
}
