import { Product } from '../models/product';
import { Banner } from '../models/banner';

export interface StorefrontBootstrap { products: Product[]; banners: Banner[]; fetchedAt: number; path: string; analyticsId?: string; }
let initial: StorefrontBootstrap | undefined;
let discarded = false;
export function discardBootstrap(): void { discarded = true; }
export function bootstrapData(): StorefrontBootstrap | undefined {
  if (typeof document === 'undefined') return undefined;
  if (!initial) {
    try { initial = JSON.parse(document.getElementById('storefront-data')?.textContent || 'null') || undefined; } catch { return undefined; }
  }
  return initial;
}
export function freshBootstrap(): StorefrontBootstrap | undefined {
  const data = bootstrapData();
  return !discarded && data && Array.isArray(data.products) && data.fetchedAt > 0 && Date.now() - data.fetchedAt < 120000 ? data : undefined;
}
