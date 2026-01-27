export interface ProcedureCategory {
  name: string;
  subcategories?: ProcedureCategory[];
  isLeaf?: boolean;
}

export const procedureCategories: ProcedureCategory[] = [
  {
    name: "Нокти",
    isLeaf: true,
  },
  {
    name: "Мигли и вежди",
    isLeaf: true,
  },
  {
    name: "Лице",
    isLeaf: true,
  },
  {
    name: "Епилация",
    subcategories: [
      {
        name: "Лазерна епилация",
        subcategories: [
          { name: "Епилация за жени", isLeaf: true },
          { name: "Епилация за мъже", isLeaf: true },
        ],
      },
      {
        name: "Кола маска",
        subcategories: [
          { name: "Епилация за жени", isLeaf: true },
          { name: "Епилация за мъже", isLeaf: true },
        ],
      },
    ],
  },
];

export function getCategoryPath(category: string, subcategories: string[] = []): string {
  if (subcategories.length === 0) {
    return category;
  }
  return [category, ...subcategories].join("/");
}

export function parseCategoryPath(path: string): { category: string; subcategories: string[] } {
  const parts = path.split("/");
  return {
    category: parts[0],
    subcategories: parts.slice(1),
  };
}
