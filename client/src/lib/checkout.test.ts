import { describe, expect, it } from "vitest";
import { buildPendingOrderPayload, buildWhatsAppOrderMessage, buildWhatsAppOrderUrl } from "./checkout";
import type { CheckoutFormValues, CheckoutLine } from "./checkout";
import type { Product } from "./catalog";

const customer: CheckoutFormValues = {
  name: "Buyer",
  email: "buyer@example.com",
  phone: "+233 24 000 0000",
  address: "Circle",
  city: "Accra",
  country: "Ghana",
  delivery: "standard",
};

const product: Product = {
  id: "phone-1",
  slug: "phone-1",
  brand: "apple",
  brandLabel: "Apple",
  name: "iPhone 11",
  shortDescription: "64GB",
  status: "active",
  price: 1640,
  currency: "GHS",
  region: "Accra",
  storageOptions: [{ label: "64GB", value: "64gb" }],
  colorOptions: [{ label: "Ask us", value: "ask-us" }],
  availabilityLabel: "Confirm stock",
  specs: {},
  sourceUrl: "https://example.com/product",
  sourceCheckedAt: "2026-10-25",
  imageRightsStatus: "pending_review",
  featured: false,
  visual: { accent: "#303236", accentSoft: "#eef0f4", device: "#222827", initials: "IP" },
};

const lines: CheckoutLine[] = [
  { product, quantity: 2, storage: "64gb", color: "ask-us" },
];

describe("checkout handoff", () => {
  it("builds a pending order payload with item counts and the selected delivery estimate", () => {
    const payload = buildPendingOrderPayload({ ...customer, delivery: "express" }, lines);

    expect(payload).toMatchObject({
      customer_name: "Buyer",
      customer_phone: "+233 24 000 0000",
      delivery_area: "Circle, Accra, Ghana",
      item_count: 2,
      total: 3304,
      currency: "GHS",
      status: "pending",
      items: [{ id: "phone-1", name: "iPhone 11", price: 1640, quantity: 2 }],
    });
    expect(payload.extra_details).toContain("buyer@example.com");
    expect(payload.extra_details).toContain("no payment has been received or verified");
  });

  it("rejects invalid customer details and quantities", () => {
    expect(() => buildPendingOrderPayload({ ...customer, email: "not-an-email" }, lines))
      .toThrow("Enter a valid email address.");
    expect(() => buildPendingOrderPayload(customer, [{ ...lines[0], quantity: 0 }]))
      .toThrow("The cart contains an invalid product or quantity.");
  });

  it("prepares a WhatsApp handoff with the saved order reference and no payment claim", () => {
    const message = buildWhatsAppOrderMessage("order-123", customer, lines);
    const url = new URL(buildWhatsAppOrderUrl(message));

    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/233555016982");
    expect(decodeURIComponent(url.searchParams.get("text") || "")).toContain("order-123");
    expect(message).toContain("No payment has been received or verified.");
  });
});
