import { Product } from '../models/product';
import { validImageUrl } from './catalog';
import { SITE, STORE_NAME, CONTACT, PAYMENT_NOTE, cleanName, productPath, categoryPath, categoryTitle, breadcrumbs } from './seo-content';

// Render current saved product data, never a snapshot keyed to old product IDs.
export function productInfo(product: Product) {
  const description = product.description || '';
  const summary = product.seoDescription?.trim() || description.replace(/\s+/g, ' ').trim();
  return {
    description,
    summary: summary.length > 240 ? summary.slice(0, 237).trim() + '...' : summary,
    features: (product.features || []).filter(feature => feature.trim()),
    duration: product.durationMonths ? `${product.durationMonths} ${product.durationMonths === 1 ? 'month' : 'months'}` : '',
    activation: product.activation?.trim() || '',
    accountType: product.accountType?.trim() || '',
    delivery: product.deliveryTime?.trim() || '',
    eligibility: product.eligibility?.trim() || '',
    renewal: product.renewalTerms?.trim() || '',
    refund: product.refundTerms?.trim() || '',
    warranty: product.warrantyTerms?.trim() || '',
  };
}
export function productFactGroups(product: Product) {
  const info = productInfo(product);
  return [
    { title: 'Plan & activation', items: [
      { label: 'Duration', value: info.duration },
      { label: 'Account type', value: info.accountType },
      { label: 'Activation', value: info.activation },
      { label: 'Delivery', value: info.delivery },
    ] },
    { title: 'Before you order', items: [
      { label: 'Eligibility', value: info.eligibility },
      { label: 'Renewal', value: info.renewal },
      { label: 'Refund terms', value: info.refund },
      { label: 'Warranty', value: info.warranty },
    ] },
  ].map(group => ({ ...group, items: group.items.filter(item => item.value) })).filter(group => group.items.length);
}
export function productFaqs(product: Product) {
  const info = productInfo(product);
  return [
    { question: `How is ${cleanName(product.name)} activated?`, answer: info.activation },
    { question: 'What account do I need for this plan?', answer: [info.accountType, info.eligibility].filter(Boolean).join(' ') },
    { question: 'What should I confirm before payment?', answer: `Confirm your account eligibility, delivery time, renewal and refund terms. ${PAYMENT_NOTE}` }
  ].filter(faq => faq.answer);
}
export function productMetadata(product: Product) {
  return { title: `${cleanName(product.name)} | Premium Dukan`, description: `${productInfo(product).summary} View the listed price, activation details and eligibility checks.`.slice(0, 170), path: productPath(product) };
}
export function structuredData(product?: Product, category?: string) {
  const organization = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: STORE_NAME, url: SITE, contactPoint: { '@type': 'ContactPoint', telephone: '+91-8247276831', contactType: 'sales and product enquiries', url: CONTACT } };
  const graph: object[] = [organization];
  if (product) {
    graph.push({ '@type': 'Product', '@id': `${SITE}${productPath(product)}#product`, name: cleanName(product.name), description: productInfo(product).summary, ...(product.imageUrl && validImageUrl(product.imageUrl, true) ? { image: [product.imageUrl] } : {}), sku: product.id,
      offers: { '@type': 'Offer', url: SITE + productPath(product), price: product.price, priceCurrency: 'USD', availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@id': `${SITE}/#organization` } } });
    graph.push(breadcrumbs([{ name: 'Home', path: '/' }, { name: categoryTitle(product.category), path: categoryPath(product.category) }, { name: cleanName(product.name), path: productPath(product) }]));
  } else if (category) graph.push(breadcrumbs([{ name: 'Home', path: '/' }, { name: categoryTitle(category), path: categoryPath(category) }]));
  return { '@context': 'https://schema.org', '@graph': graph };
}
