interface Priced {
  price: number;
  discount_percentage: number | null;
}

export function hasDiscount(procedure: Priced): boolean {
  return !!procedure.discount_percentage && procedure.discount_percentage > 0;
}

/** Price after discount, rounded to cents. */
export function getFinalPrice(procedure: Priced): number {
  const discount = hasDiscount(procedure) ? Math.min(procedure.discount_percentage!, 100) : 0;
  return Math.round(procedure.price * (100 - discount)) / 100;
}
