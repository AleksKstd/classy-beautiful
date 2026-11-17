import { getFinalPrice } from "@/lib/pricing";
import type { Procedure } from "@/types/database";

/*
 * How procedures are grouped and ordered on the price list and in the
 * booking wizard: section (Лице) → optional part (Жени / Мъже) → group
 * (Карбонов пилинг) → optional sub-group (на капиляри) → procedures.
 *
 * Procedures are matched by their category (`type` in the database) AND
 * name, because some names exist for both women and men. A procedure that
 * is not listed here (e.g. one added later in the admin panel) still shows
 * up: it is placed at the end of the section its category belongs to, in a
 * group named after the category. Edit the lists below to change the order.
 */

interface GroupSpec {
  name: string;
  /** Database category (`procedures.type`) of the procedures in this group. */
  type?: string;
  /** Exact procedure names, in display order. */
  procedures?: string[];
  children?: GroupSpec[];
}

interface PartSpec {
  /** Shown as a divider (e.g. "Жени"); null for sections with one part. */
  label: string | null;
  groups: GroupSpec[];
}

interface SectionSpec {
  name: string;
  /** Anchor id on the price list, e.g. /proceduri#lice */
  id: string;
  description: string;
  /** Database categories that belong to this section (also used for new procedures). */
  types: Record<string, string | null>;
  parts: PartSpec[];
}

const LICE = "Естетични процедури - лице";
const TYALO = "Естетични процедури - тяло";

const SECTIONS: SectionSpec[] = [
  {
    name: "Нокти",
    id: "nokti",
    description: "Педикюр и грижа за ноктите",
    types: { "Нокти": null },
    parts: [
      {
        label: null,
        groups: [
          { name: "Медицински педикюр", type: "Нокти", procedures: ["Медицински педикюр без лак"] },
          {
            name: "Третиране на гъбичен нокът",
            type: "Нокти",
            procedures: ["Третиране на гъбичен нокът - 1 нокът", "Третиране на гъбичен нокът - 10 нокътя"],
          },
        ],
      },
    ],
  },
  {
    name: "Лице",
    id: "lice",
    description: "Пилинг, лифтинг, мигли, вежди и лазер",
    types: { "Вежди": null, "Мигли": null, "Терапии за лице": null, [LICE]: null },
    parts: [
      {
        label: null,
        groups: [
          {
            name: "Карбонов пилинг",
            type: LICE,
            procedures: ["Карбонов пилинг - лице", "Карбонов пилинг - лице + шия", "Карбонов пилинг - лице + шия и деколте"],
          },
          { name: "Хиалуронова терапия", type: "Терапии за лице", procedures: ["Хиалуронова терапия за лице"] },
          {
            name: "HIFU (Хайфу) лифтинг",
            type: LICE,
            procedures: [
              "HIFU (Хайфу) лифтинг на цяло лице",
              "HIFU (Хайфу) лифтинг на чело",
              "HIFU (Хайфу) лифтинг около очите",
              "HIFU (Хайфу) лифтинг на бузи и скули",
              "HIFU (Хайфу) лифтинг на назолабиални гънки",
              "HIFU (Хайфу) лифтинг срещу двойна брадичка",
              "HIFU (Хайфу) лифтинг на шия",
              "HIFU (Хайфу) лифтинг на деколте",
            ],
          },
          { name: "Ламиниране + боядисване на мигли", type: "Мигли", procedures: ["Ламиниране + боядисване на мигли"] },
          { name: "Ламиниране + боядисване на вежди", type: "Вежди", procedures: ["Ламиниране + боядисване на вежди"] },
          {
            name: "Колагенови мезоконци",
            type: LICE,
            procedures: ["Колагенови мезоконци на цяло лице", "Колагенови мезоконци на цяло лице + шия"],
          },
          {
            name: "Лазерно лечение на акне",
            type: LICE,
            procedures: [
              "Лазерно лечение на акне - лице",
              "Лазерно лечение на акне - лице + шия",
              "Лазерно лечение на акне - лице + шия и деколте",
            ],
          },
          {
            name: "Лазерно премахване",
            children: [
              {
                name: "на капиляри",
                type: LICE,
                procedures: ["Лазерно премахване на капиляри - малка зона", "Лазерно премахване на капиляри - голяма зона"],
              },
              {
                name: "на пигментации",
                type: LICE,
                procedures: ["Лазерно премахване на пигментации - до 5 броя", "Лазерно премахване на пигментации - до 10 броя"],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Епилация",
    id: "epilaciya",
    description: "Лазер и кола маска за жени и мъже",
    types: {
      "Лазерна епилация - жени": "Жени",
      "Кола маска - жени": "Жени",
      "Лазерна епилация - мъже": "Мъже",
      "Кола маска - мъже": "Мъже",
    },
    parts: [
      {
        label: "Жени",
        groups: [
          {
            name: "Лазерна епилация",
            type: "Лазерна епилация - жени",
            procedures: [
              "Подмишници - лазерна епилация",
              "Бикини зона - лазерна епилация",
              "Пълен интим - лазерна епилация",
              "1/2 крака - лазерна епилация",
              "Цели крака - лазерна епилация",
              "1/2 ръце - лазерна епилация",
              "Цели ръце - лазерна епилация",
              "Горна устна - лазерна епилация",
              "Брадичка - лазерна епилация",
              "Скули - лазерна епилация",
              "Бакенбарди - лазерна епилация",
              "Цяло лице - лазерна епилация",
              "Коремна лента - лазерна епилация",
              "Корем - лазерна епилация",
              "Седалище - лазерна епилация",
              "Цяло тяло - лазерна епилация",
            ],
          },
          {
            name: "Кола маска",
            type: "Кола маска - жени",
            procedures: [
              "Подмишници - кола маска",
              "Интим - кола маска",
              "1/2 крака - кола маска",
              "Цели крака - кола маска",
              "1/2 ръце - кола маска",
              "Цели ръце - кола маска",
              "Горна устна - кола маска",
              "Брадичка - кола маска",
              "Бакенбарди - кола маска",
            ],
          },
        ],
      },
      {
        label: "Мъже",
        groups: [
          {
            name: "Лазерна епилация",
            type: "Лазерна епилация - мъже",
            procedures: [
              "Гръб - лазерна епилация",
              "Гърди - лазерна епилация",
              "Рамене - лазерна епилация",
              "Корем - лазерна епилация",
              "Подмишници - лазерна епилация",
              "Седалище - лазерна епилация",
              "1/2 ръце - лазерна епилация",
              "Цели ръце - лазерна епилация",
              "1/2 крака - лазерна епилация",
              "Цели крака - лазерна епилация",
              "Скули - лазерна епилация",
              "Бакенбарди - лазерна епилация",
              "Брадичка - лазерна епилация",
              "Горна устна - лазерна епилация",
              "Цяло лице - лазерна епилация",
              "Цяло тяло - лазерна епилация",
            ],
          },
          {
            name: "Кола маска",
            type: "Кола маска - мъже",
            procedures: [
              "Гръб - кола маска",
              "Гърди - кола маска",
              "Подмишници - кола маска",
              "1/2 ръце - кола маска",
              "Цели ръце - кола маска",
              "1/2 крака - кола маска",
              "Цели крака - кола маска",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Тяло",
    id: "tyalo",
    description: "Лимфодренаж, HIFU и лазер за тяло",
    types: { "Пресотерапия и лимфодренаж": null, [TYALO]: null, "Пилинг на тяло": null },
    parts: [
      {
        label: null,
        groups: [
          {
            name: "Пресотерапия и лимфодренаж",
            type: "Пресотерапия и лимфодренаж",
            procedures: ["Пресотерапия и лимфодренаж - Цяло тяло", "Пресотерапия и лимфодренаж - Ръце/крака/ханш"],
          },
          {
            name: "HIFU Липосоникс",
            type: TYALO,
            procedures: [
              "HIFU Липосоникс за редукция на мазнини - корем",
              "HIFU Липосоникс за редукция на мазнини - паласки",
              "HIFU Липосоникс за редукция на мазнини - брич",
              "HIFU Липосоникс за редукция на мазнини - вътрешна част на бедрата",
              "HIFU Липосоникс за редукция на мазнини - предна част на бедрата",
              "HIFU Липосоникс за редукция на мазнини - задна част на бедрата",
              "HIFU Липосоникс за редукция на мазнини - седалище",
              "HIFU Липосоникс за редукция на мазнини - ръце",
              "HIFU Липосоникс за повдигане на бюст",
            ],
          },
          { name: "Карбонов пилинг на гръб", type: "Пилинг на тяло", procedures: ["Карбонов пилинг на гръб"] },
          { name: "Лазерно премахване на татуировка", type: TYALO, procedures: ["Лазерно премахване на татуировка"] },
        ],
      },
    ],
  },
];

const OTHER: SectionSpec = { name: "Други", id: "drugi", description: "Още процедури", types: {}, parts: [] };

export interface CatalogGroup {
  name: string;
  procedures: Procedure[];
  children: CatalogGroup[];
}

export interface CatalogPart {
  label: string | null;
  groups: CatalogGroup[];
}

export interface CatalogSection {
  name: string;
  id: string;
  description: string;
  parts: CatalogPart[];
}

const key = (type: string, name: string) => `${type}\u0000${name}`;

/** Every procedure of a group, including its sub-groups, in display order. */
export function groupProcedures(group: CatalogGroup): Procedure[] {
  return [...group.procedures, ...group.children.flatMap(groupProcedures)];
}

export function sectionProcedures(section: CatalogSection): Procedure[] {
  return section.parts.flatMap((part) => part.groups.flatMap(groupProcedures));
}

/**
 * A group holding exactly one procedure is shown as that procedure alone,
 * without a heading above it (a heading over a single row adds nothing).
 */
export function isSingle(group: CatalogGroup): boolean {
  return group.children.length === 0 && group.procedures.length === 1;
}

/** Lowest current price in a group, for "от 51,13 €" next to its heading. */
export function lowestPrice(group: CatalogGroup): number | null {
  const prices = groupProcedures(group).map(getFinalPrice);
  return prices.length ? Math.min(...prices) : null;
}

/** Arranges active procedures into sections, parts and groups. Empty ones are left out. */
export function buildCatalog(procedures: Procedure[]): CatalogSection[] {
  const byKey = new Map(procedures.map((p) => [key(p.type, p.name), p]));
  const used = new Set<string>();

  const buildGroup = (spec: GroupSpec): CatalogGroup => ({
    name: spec.name,
    procedures: (spec.procedures ?? []).flatMap((name) => {
      const procedure = spec.type ? byKey.get(key(spec.type, name)) : undefined;
      if (!procedure) return [];
      used.add(procedure.id);
      return [procedure];
    }),
    children: (spec.children ?? []).map(buildGroup).filter((g) => groupProcedures(g).length > 0),
  });

  const sections: CatalogSection[] = [...SECTIONS, OTHER].map((spec) => ({
    name: spec.name,
    id: spec.id,
    description: spec.description,
    parts: spec.parts.map((part) => ({
      label: part.label,
      groups: part.groups.map(buildGroup).filter((g) => groupProcedures(g).length > 0),
    })),
  }));

  // Anything not listed above goes to the end of its section, grouped by category.
  const leftovers = procedures.filter((p) => !used.has(p.id));
  for (const procedure of leftovers) {
    const index = SECTIONS.findIndex((s) => procedure.type in s.types);
    const section = sections[index === -1 ? sections.length - 1 : index];
    const label = index === -1 ? null : SECTIONS[index].types[procedure.type];
    let part = section.parts.find((p) => p.label === label);
    if (!part) {
      part = { label, groups: [] };
      section.parts.push(part);
    }
    let group = part.groups.find((g) => g.name === procedure.type && g.children.length === 0);
    if (!group) {
      group = { name: procedure.type, procedures: [], children: [] };
      part.groups.push(group);
    }
    group.procedures.push(procedure);
  }

  return sections
    .map((section) => ({ ...section, parts: section.parts.filter((part) => part.groups.length > 0) }))
    .filter((section) => section.parts.length > 0);
}

/** Where a procedure sits, e.g. "Лице › HIFU (Хайфу) лифтинг", for search results. */
export function procedurePath(sections: CatalogSection[], procedureId: string): string | null {
  for (const section of sections) {
    for (const part of section.parts) {
      for (const group of part.groups) {
        const inGroup = (g: CatalogGroup): boolean =>
          g.procedures.some((p) => p.id === procedureId) || g.children.some(inGroup);
        if (inGroup(group)) {
          return [section.name, part.label, isSingle(group) ? null : group.name].filter(Boolean).join(" › ");
        }
      }
    }
  }
  return null;
}
