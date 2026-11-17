import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog, groupProcedures, isSingle, lowestPrice, procedurePath, sectionProcedures } from "@/lib/catalog";
import type { Procedure } from "@/types/database";

/** The real catalogue from supabase/seed.sql, so the tests follow the salon's list. */
function seedProcedures(): Procedure[] {
  const sql = readFileSync(path.resolve(__dirname, "../../supabase/seed.sql"), "utf-8");
  const rows = [...sql.matchAll(/^\('([^']*)', (\d+), ([\d.]+), '([^']*)', '([^']*)'\)/gm)];
  return rows.map(([, name, duration, price, type, technician], i) => ({
    id: `p${i}`,
    name,
    duration_minutes: Number(duration),
    price: Number(price),
    type,
    technician,
    description: null,
    discount_percentage: null,
    is_active: true,
    created_at: "",
    updated_at: "",
  })) as unknown as Procedure[];
}

describe("buildCatalog", () => {
  const procedures = seedProcedures();
  const catalog = buildCatalog(procedures);

  it("places every seeded procedure exactly once, with nothing left over", () => {
    expect(procedures.length).toBeGreaterThan(80);
    const placed = catalog.flatMap(sectionProcedures).map((p) => p.id);
    expect(placed).toHaveLength(procedures.length);
    expect(new Set(placed).size).toBe(procedures.length);
    expect(catalog.map((s) => s.name)).toEqual(["Нокти", "Лице", "Епилация", "Тяло"]);
  });

  it("keeps the owner's order for Лице", () => {
    const lice = catalog.find((s) => s.id === "lice")!;
    expect(lice.parts[0].groups.map((g) => g.name)).toEqual([
      "Карбонов пилинг",
      "Хиалуронова терапия",
      "HIFU (Хайфу) лифтинг",
      "Ламиниране + боядисване на мигли",
      "Ламиниране + боядисване на вежди",
      "Колагенови мезоконци",
      "Лазерно лечение на акне",
      "Лазерно премахване",
    ]);
    const removal = lice.parts[0].groups.at(-1)!;
    expect(removal.children.map((c) => c.name)).toEqual(["на капиляри", "на пигментации"]);
    expect(isSingle(lice.parts[0].groups[1])).toBe(true);
    expect(isSingle(removal)).toBe(false);
  });

  it("keeps women's and men's procedures with the same name apart", () => {
    const epilation = catalog.find((s) => s.id === "epilaciya")!;
    expect(epilation.parts.map((p) => p.label)).toEqual(["Жени", "Мъже"]);
    const [women, men] = epilation.parts.map((p) => p.groups[0].procedures.map((x) => x.type));
    expect(new Set(women)).toEqual(new Set(["Лазерна епилация - жени"]));
    expect(new Set(men)).toEqual(new Set(["Лазерна епилация - мъже"]));
  });

  it("puts procedures added later at the end of their section, or under Други", () => {
    const extra = [
      { ...procedures[0], id: "new1", name: "Нова процедура за лице", type: "Терапии за лице" },
      { ...procedures[0], id: "new2", name: "Масаж", type: "Масажи" },
    ];
    const withExtra = buildCatalog([...procedures, ...extra]);
    const lice = withExtra.find((s) => s.id === "lice")!;
    const last = lice.parts[0].groups.at(-1)!;
    expect(last.name).toBe("Терапии за лице");
    expect(last.procedures.map((p) => p.id)).toEqual(["new1"]);
    expect(withExtra.at(-1)!.name).toBe("Други");
    expect(procedurePath(withExtra, "new2")).toBe("Други");
  });

  it("leaves out empty groups and sections and reports group prices", () => {
    const nails = procedures.filter((p) => p.type === "Нокти");
    const small = buildCatalog(nails);
    expect(small.map((s) => s.name)).toEqual(["Нокти"]);
    const fungus = small[0].parts[0].groups[1];
    expect(groupProcedures(fungus)).toHaveLength(2);
    expect(lowestPrice(fungus)).toBeCloseTo(7.67);
    expect(procedurePath(small, fungus.procedures[0].id)).toBe("Нокти › Третиране на гъбичен нокът");
  });
});
