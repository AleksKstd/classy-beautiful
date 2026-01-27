import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("procedures")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Процедурата не е намерена" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Грешка при зареждане" },
      { status: 500 }
    );
  }
}
