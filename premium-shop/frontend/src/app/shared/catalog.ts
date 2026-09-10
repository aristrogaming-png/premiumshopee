import { Product } from "../models/product";

export type CatalogSort = "default" | "price-asc" | "price-desc" | "newest";
export interface CatalogFilters {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  duration: number | null;
  inStock: boolean;
  sort: CatalogSort;
}

const categoryIcons: Record<string, string> = {
  streaming: "🍿",
  video: "🍿",
  music: "🎧",
  "ai tools": "🤖",
  ai: "🤖",
  design: "🎨",
  productivity: "💻",
  tools: "🧰",
  career: "💼",
  business: "💼",
  security: "🛡️",
};
export function categoryIcon(category: string): string {
  return categoryIcons[category.trim().toLowerCase()] || "✨";
}

export function filterCatalog(
  products: Product[],
  filters: CatalogFilters,
): Product[] {
  const search = filters.search.trim().toLowerCase();
  const result = products.filter(
    (product) =>
      (!search ||
        `${product.name}\n${product.description || ""}`
          .toLowerCase()
          .includes(search)) &&
      (!filters.category || product.category === filters.category) &&
      (filters.minPrice == null || product.price >= filters.minPrice) &&
      (filters.maxPrice == null || product.price <= filters.maxPrice) &&
      (filters.duration == null ||
        product.durationMonths === filters.duration) &&
      (!filters.inStock || product.stock > 0),
  );
  if (filters.sort === "default") return result;
  return result.sort((a, b) => {
    let difference = 0;
    if (filters.sort === "price-asc") difference = a.price - b.price;
    if (filters.sort === "price-desc") difference = b.price - a.price;
    if (filters.sort === "newest")
      difference =
        (Date.parse(b.createdAt || "") || 0) -
        (Date.parse(a.createdAt || "") || 0);
    return difference || a.id.localeCompare(b.id);
  });
}

export function whatsappUrl(product: Product): string {
  const message = `Hi, I am interested in buying ${product.name} for $${product.price}`;
  return `https://wa.me/918247276831?text=${encodeURIComponent(message)}`;
}

export function validImageUrl(value: string, required = false): boolean {
  if (!value.trim()) return !required;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function validBannerTarget(value: string): boolean {
  if (
    !value ||
    /[\\\u0000-\u0020]/.test(value) ||
    /%5c|%2f/i.test(value.split("?")[0])
  )
    return false;
  try {
    if (value.startsWith("/") && !value.startsWith("//")) {
      const path = new URL(value, "https://internal.invalid").pathname;
      return (
        path === "/" ||
        /^\/product\/[a-f\d]{24}$/i.test(path) ||
        /^\/category\/[^/]+$/.test(path)
      );
    }
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
