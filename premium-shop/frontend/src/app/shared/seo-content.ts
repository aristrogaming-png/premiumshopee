import { Product } from '../models/product';

export const SITE = 'https://www.premiumdukan.com';
export const STORE_NAME = 'Premium Dukan';
export const CONTACT = 'https://wa.me/918247276831';
export const ELIGIBILITY_NOTE = 'Check the account requirements and provider restrictions for your chosen plan before payment. Activation requirements vary by product.';
export const PAYMENT_NOTE = 'Prices are listed in USD. Confirm your order total and payment method on WhatsApp before paying.';
export const UNKNOWN = 'Not specified for this offer. Please confirm on WhatsApp before payment.';
export function cleanName(name: string): string { return name.replace(/[^\p{L}\p{N}\s&+().,:/'–—-]/gu, '').trim(); }
export function slug(value: string): string { return cleanName(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subscription'; }
// Existing product IDs and category URLs remain the canonical URLs. Optional name aliases redirect permanently.
export function productPath(product: Product): string { return `/product/${encodeURIComponent(product.id)}`; }
export function categoryPath(category: string): string { return `/category/${encodeURIComponent(category)}`; }
export function categoryTitle(category: string): string {
  const titles: Record<string, string> = { ai: 'AI tools and subscriptions', 'design & editing': 'Design and video editing tools', software: 'Software and productivity subscriptions', education: 'Learning and education subscriptions' };
  return titles[category.toLowerCase()] || `${category} subscriptions`;
}
export function categoryIntro(category: string): string {
  const intros: Record<string, string> = {
    ai: 'Compare the listed AI writing, voice, presentation and website tools. Check each plan’s duration, included features and account requirements before choosing.',
    'design & editing': 'Explore design and video editing subscriptions, including the Canva, CapCut and Adobe offers currently in the catalogue. Compare access duration and activation requirements on each product page.',
    software: 'Browse software, productivity and developer tools, from Windows activation and Microsoft 365 to workflow automation and databases. Account delivery and licence eligibility differ by offer.',
    education: 'Compare language learning and online course offers. Check course coverage, invite or coupon requirements, and eligibility before buying.'
  };
  return intros[category.toLowerCase()] || `Compare the ${category} offers currently listed by Premium Dukan. Read the plan details and confirm activation eligibility before payment.`;
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: SITE + item.path })) };
}
export const informationPaths = ['about', 'contact', 'activation-delivery', 'refunds', 'terms', 'buying-guide', 'privacy'];
export function organizationData(category?: string) {
  const graph: object[] = [{ '@type': 'Organization', '@id': `${SITE}/#organization`, name: STORE_NAME, url: SITE, contactPoint: { '@type': 'ContactPoint', telephone: '+91-8247276831', contactType: 'sales and product enquiries', url: CONTACT } }];
  if (category) graph.push(breadcrumbs([{ name: 'Home', path: '/' }, { name: categoryTitle(category), path: categoryPath(category) }]));
  return { '@context': 'https://schema.org', '@graph': graph };
}
