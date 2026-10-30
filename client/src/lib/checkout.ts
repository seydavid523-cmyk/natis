import { formatPrice } from "./catalog";
import type { Product } from "./catalog";

export type CheckoutFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  delivery: "standard" | "express";
};

export type CheckoutLine = {
  product: Product;
  quantity: number;
  storage: string;
  color: string;
};

export type PendingOrderPayload = {
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  extra_details: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  item_count: number;
  total: number;
  currency: "GHS";
  status: "pending";
};

export const WHATSAPP_PHONE = "233555016982";

export function buildPendingOrderPayload(
  customer: CheckoutFormValues,
  lines: CheckoutLine[],
): PendingOrderPayload {
  const name = customer.name.trim();
  const email = customer.email.trim();
  const phone = customer.phone.trim();
  const deliveryArea = [customer.address, customer.city, customer.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  if (name.length < 1 || name.length > 120) {
    throw new Error("Enter your name (up to 120 characters).");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (phone.length < 5 || phone.length > 40) {
    throw new Error("Enter a valid phone number.");
  }
  if (deliveryArea.length < 1 || deliveryArea.length > 160) {
    throw new Error("Check your delivery address; it must be 160 characters or fewer.");
  }
  if (customer.delivery !== "standard" && customer.delivery !== "express") {
    throw new Error("Choose a delivery option.");
  }
  if (!lines.length) throw new Error("Your cart is empty.");

  const items = lines.map(({ product, quantity }) => {
    if (
      !product.id ||
      !product.name.trim() ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 9 ||
      !Number.isFinite(product.price) ||
      product.price < 0
    ) {
      throw new Error("The cart contains an invalid product or quantity.");
    }
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = customer.delivery === "express" ? 24 : 0;
  const extraDetails = [
    `Email: ${email}`,
    `Delivery option: ${customer.delivery === "express" ? "Express" : "Standard"}`,
    "Payment is pending; no payment has been received or verified.",
  ].join("\n");

  return {
    customer_name: name,
    customer_phone: phone,
    delivery_area: deliveryArea,
    extra_details: extraDetails,
    items,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: subtotal + deliveryFee,
    currency: "GHS",
    status: "pending",
  };
}

export function buildWhatsAppOrderMessage(
  orderId: string,
  customer: CheckoutFormValues,
  lines: CheckoutLine[],
): string {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const deliveryFee = customer.delivery === "express" ? 24 : 0;
  const items = lines
    .map(({ product, quantity, storage, color }) => {
      const variant = [storage, color].filter((value) => value && value !== "default").join(" · ");
      return `${quantity} × ${product.name}${variant ? ` (${variant})` : ""} — ${formatPrice(product.price * quantity)}`;
    })
    .join("\n");

  return [
    `Hi Natis Phone Ent, I would like to confirm order request ${orderId}.`,
    items,
    `Estimated total: ${formatPrice(subtotal + deliveryFee)}`,
    `Delivery: ${customer.delivery === "express" ? "Express" : "Standard"} (please confirm timing and final fee).`,
    `Name: ${customer.name.trim()}`,
    `Phone: ${customer.phone.trim()}`,
    `Email: ${customer.email.trim()}`,
    `Delivery address: ${[customer.address, customer.city, customer.country].map((part) => part.trim()).filter(Boolean).join(", ")}`,
    "Payment is pending. No payment has been received or verified.",
  ].join("\n");
}

export function buildWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
