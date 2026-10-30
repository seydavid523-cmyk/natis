import { describe, expect, it } from "vitest";
import { hasDuplicateProduct, products } from "./catalog";

describe("catalog duplicate detection", () => {
  const existing = products[0];

  it("matches the existing brand and product name without case or whitespace differences", () => {
    expect(hasDuplicateProduct(products, ` ${existing.brandLabel.toUpperCase()} `, ` ${existing.name.toUpperCase()} `)).toBe(true);
  });

  it("allows an edit to keep its own identity and a genuinely different product", () => {
    expect(hasDuplicateProduct(products, existing.brandLabel, existing.name, existing.id)).toBe(false);
    expect(hasDuplicateProduct(products, existing.brandLabel, `${existing.name} Plus`)).toBe(false);
  });
});
