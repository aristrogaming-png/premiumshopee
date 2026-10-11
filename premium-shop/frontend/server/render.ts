import { Product } from '../src/app/models/product';
import { Banner } from '../src/app/models/banner';
import { SITE, CONTACT, categoryPath, categoryTitle, categoryIntro, cleanName, productPath, breadcrumbs, PAYMENT_NOTE } from '../src/app/shared/seo-content';
import { productInfo, productFactGroups, productFaqs, productMetadata, structuredData } from '../src/app/shared/product-content';
import { informationPages } from '../src/app/shared/information-content';
import { whatsappUrl, validBannerTarget } from '../src/app/shared/catalog';
import { productImageUrl as imageUrl, productImageSrcset, DETAIL_IMAGE_SIZES, RELATED_IMAGE_SIZES } from '../src/app/shared/product-image-source';

export interface Snapshot { products: Product[]; banners: Banner[]; fetchedAt: number; }
export interface Page { status: number; headers: Record<string, string>; body: string; }
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const link = (path: string, text: string) => `<a href="${escapeHtml(path)}">${escapeHtml(text)}</a>`;
const safeImage = (url: string) => { try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) && !parsed.username && !parsed.password ? url : '/assets/placeholder.svg'; } catch { return '/assets/placeholder.svg'; } };
function artwork(product: Product, width: number, eager = false) {
  const image = safeImage(product.imageUrl || '');
  const srcset = productImageSrcset(image);
  const sizes = width > 640 ? DETAIL_IMAGE_SIZES : width === 320 ? RELATED_IMAGE_SIZES : '(min-width: 1212px) 385px, (min-width: 1100px) 32vw, (min-width: 700px) 48vw, calc(100vw - 32px)';
  return `<img src="${escapeHtml(imageUrl(image, width))}" ${srcset ? `srcset="${escapeHtml(srcset)}"` : ''} sizes="${sizes}" width="960" height="540" alt="${escapeHtml(product.name)}" loading="${eager ? 'eager' : 'lazy'}" ${eager ? 'fetchpriority="high"' : ''} decoding="async">`;
}
const helpLinks = () => `<nav class="help-links" aria-label="Buying information">${link('/activation-delivery', 'Activation and delivery')}${link('/refunds', 'Refund information')}${link('/buying-guide', 'Buying guide')}</nav>`;
function frame(content: string): string {
  return `<a href="#main-content" class="skip-link">Skip to content</a><header class="site-header page-width"><a href="/" class="brand" aria-label="Premium Dukan home"><span class="brand-mark" aria-hidden="true">P</span><span><strong>Premium Dukan</strong><small>Digital subscriptions, made simple.</small></span></a></header><main id="main-content" class="page-width main-content">${content}</main><footer class="site-footer page-width"><nav class="help-links" aria-label="Store information">${Object.entries(informationPages).map(([path, page]) => link('/' + path, page.title)).join('')}</nav><p>${escapeHtml(PAYMENT_NOTE)}</p><span>© ${new Date().getFullYear()} Premium Dukan</span>${link(CONTACT, 'Contact on WhatsApp')}</footer>`;
}
function factsHtml(product: Product): string {
  const groups = productFactGroups(product);
  if (!groups.length) return '';
  return `<div class="detail-fact-grid">${groups.map(group => `<section class="detail-fact-card"><h3>${escapeHtml(group.title)}</h3><dl>${group.items.map(fact => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
}
function productHtml(product: Product, products: Product[]): string {
  const related = products.filter(item => item.id !== product.id && item.category === product.category).slice(0, 4);
  const info = productInfo(product);
  const price = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(product.price);
  return `<nav class="breadcrumbs detail-breadcrumbs" aria-label="Breadcrumb">${link('/', 'Home')}<span aria-hidden="true">/</span>${link(categoryPath(product.category), categoryTitle(product.category))}<span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(product.name)}</span></nav>
  <article class="product-detail">
    <div class="detail-hero">
      <div class="detail-visual"><div class="detail-art">${artwork(product, 960, true)}</div><div class="detail-art-caption"><span>Digital product</span><span>Delivered online <span aria-hidden="true">&#8599;</span></span></div></div>
      <section class="detail-summary" aria-label="Product information">
        <div class="detail-labels"><a class="detail-category" href="${escapeHtml(categoryPath(product.category))}">${escapeHtml(categoryTitle(product.category))}</a><span class="detail-stock${product.stock <= 0 ? ' sold-out' : ''}">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div>
        <h1>${escapeHtml(product.name)}</h1>${info.summary ? `<p class="detail-intro">${escapeHtml(info.summary)}</p>` : ''}
        ${product.planLabel || product.durationMonths ? `<div class="detail-plan">${product.planLabel ? `<span>${escapeHtml(product.planLabel)}</span>` : ''}${product.durationMonths ? `<span>${product.durationMonths} ${product.durationMonths === 1 ? 'month' : 'months'}</span>` : ''}</div>` : ''}
        <div class="detail-purchase"><span class="detail-price-label">Price</span><strong class="detail-price"><small>USD</small> $${price}</strong>
          ${product.stock > 0 ? `<a class="detail-buy" data-product-id="${escapeHtml(product.id)}" href="${escapeHtml(whatsappUrl(product))}" target="_blank" rel="noopener noreferrer">Buy on WhatsApp<span aria-hidden="true">&#8599;</span></a>` : '<span class="detail-buy" aria-disabled="true">Currently out of stock</span>'}
          <p class="detail-payment-note">${escapeHtml(PAYMENT_NOTE)}</p>
        </div>
        <div class="detail-assistance"><span>Have a question before ordering?</span><a href="/contact">Talk to us <span aria-hidden="true">&#8594;</span></a></div>
      </section>
    </div>
    <section class="detail-overview" aria-labelledby="description-title">
      <div class="detail-section-heading"><span class="detail-eyebrow">Know your plan</span><h2 id="description-title">Product details</h2><p>The features, access and activation information for this offer.</p></div>
      ${info.description.trim() ? `<div class="detail-description-copy">${escapeHtml(info.description)}</div>` : ''}
      ${info.features.length ? `<ul class="detail-features">${info.features.map(feature => `<li><span aria-hidden="true">&#10003;</span>${escapeHtml(feature)}</li>`).join('')}</ul>` : ''}
      ${factsHtml(product)}
      <nav class="detail-guide-links" aria-label="Buying information"><a href="/activation-delivery">Activation &amp; delivery <span aria-hidden="true">&#8599;</span></a><a href="/buying-guide">Buying guide <span aria-hidden="true">&#8599;</span></a><a href="/refunds">Refund information <span aria-hidden="true">&#8599;</span></a></nav>
    </section>
    <section class="detail-faq-section" aria-labelledby="faq-title"><div class="detail-section-heading"><span class="detail-eyebrow">A little more clarity</span><h2 id="faq-title">Frequently asked questions</h2><p>Useful details before you choose your plan.</p></div><div class="detail-faq-list">${productFaqs(product).map(faq => `<details class="product-faq"><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join('')}</div></section>
    ${related.length ? `<section class="detail-related" aria-labelledby="related-title"><div class="detail-section-heading"><span class="detail-eyebrow">Keep exploring</span><h2 id="related-title">Related subscriptions</h2></div><div class="detail-related-grid">${related.map(item => `<a class="detail-related-card" href="${escapeHtml(productPath(item))}">${artwork(item, 320)}<div><span class="detail-related-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p><strong>USD $${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(item.price)}</strong><span>${item.stock > 0 ? 'View plan' : 'Out of stock'} <span aria-hidden="true">&#8594;</span></span></p></div></a>`).join('')}</div></section>` : ''}
  </article>`;
}
function catalogHtml(snapshot: Snapshot, category?: string, search = ''): string {
  const products = snapshot.products.filter(product => (!category || product.category === category) && (!search || `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())));
  const categories = [...new Set(snapshot.products.map(product => product.category))];
  const banner = !category ? snapshot.banners.find(item => validBannerTarget(item.targetUrl)) : undefined;
  const bannerImage = banner ? safeImage(banner.imageUrl) : '';
  const bannerSrcset = productImageSrcset(bannerImage);
  return `<form class="ssr-search" action="/" method="get"><label>Search subscriptions <input name="search" type="search" value="${escapeHtml(search)}" placeholder="Search subscriptions..."></label><button type="submit">Search</button></form>${banner && !category ? `<a href="${escapeHtml(banner.targetUrl)}"><img class="ssr-hero" src="${escapeHtml(imageUrl(bannerImage, 960))}" ${bannerSrcset ? `srcset="${escapeHtml(bannerSrcset)}"` : ''} sizes="(min-width: 1212px) 1180px, calc(100vw - 32px)" alt="${escapeHtml(banner.altText)}" width="1200" height="600" loading="eager" fetchpriority="high" decoding="async"></a>` : ''}<section class="seo-panel">${category ? `<nav aria-label="Breadcrumb">${link('/', 'Home')} / ${escapeHtml(categoryTitle(category))}</nav>` : ''}<h1>${escapeHtml(category ? categoryTitle(category) : 'Digital subscriptions and software offers')}</h1><p>${escapeHtml(category ? categoryIntro(category) : 'Compare AI, software, design and learning offers. Check each plan’s duration, account type and activation eligibility before payment.')}</p><nav class="help-links" aria-label="Subscription categories">${link('/', 'All subscriptions')}${categories.map(value => link(categoryPath(value), categoryTitle(value))).join('')}</nav></section><div class="ssr-grid">${products.map((product, index) => `<article class="ssr-card"><a href="${productPath(product)}">${artwork(product, 640, index === 0 && !banner)}</a><div class="ssr-card-content"><h2>${link(productPath(product), product.name)}</h2><p>${escapeHtml(productInfo(product).summary)}</p><strong>USD $${product.price}</strong><span>${product.stock > 0 ? 'In stock' : 'Out of stock'}</span>${link(productPath(product), 'Details')}${product.stock > 0 ? `<a data-product-id="${escapeHtml(product.id)}" href="${escapeHtml(whatsappUrl(product))}" target="_blank" rel="noopener noreferrer">Buy on WhatsApp</a>` : ''}</div></article>`).join('')}</div>${!products.length ? '<section class="state-panel"><h2>No subscriptions found</h2><a href="/">Browse all subscriptions</a></section>' : ''}${helpLinks()}`;
}

export function renderPage(template: string, pathname: string, query: URLSearchParams, snapshot: Snapshot, config: { analyticsId?: string; verification?: string } = {}): Page {
  if (pathname === '/buying-from-india-usa-uk') return { status: 308, headers: { Location: '/buying-guide', 'Cache-Control': 'public, max-age=0, s-maxage=3600' }, body: '' };
  let title = 'AI, Software & Design Subscriptions | Premium Dukan';
  let description = 'Compare digital subscription offers, prices, duration and activation details. Explore the global catalogue and order on WhatsApp.';
  let content = '';
  let status = 200;
  let canonical = pathname;
  let noindex = ['search', 'q', 'sort', 'minPrice', 'maxPrice', 'duration', 'inStock'].some(key => query.has(key));
  let schema: object = structuredData();
  let bootstrap = true;
  const segments = pathname.split('/').filter(Boolean).map(value => { try { return decodeURIComponent(value); } catch { return value; } });
  const product = segments[0] === 'product' && segments.length === 2 ? snapshot.products.find(item => item.id === segments[1]) : undefined;
  if (pathname === '/') {
    const queryCategory = query.get('category');
    if (queryCategory && snapshot.products.some(item => item.category === queryCategory) && !noindex) return { status: 308, headers: { Location: categoryPath(queryCategory), 'Cache-Control': 'public, max-age=0, s-maxage=60' }, body: '' };
    content = catalogHtml(snapshot, queryCategory || undefined, query.get('search') || query.get('q') || '');
    if (noindex) { title = 'Search subscriptions | Premium Dukan'; schema = []; }
  } else if (product) {
    const meta = productMetadata(product); title = meta.title; description = meta.description; canonical = meta.path;
    content = productHtml(product, snapshot.products); schema = structuredData(product);
  } else if (segments[0] === 'category' && segments.length === 2 && snapshot.products.some(item => item.category === segments[1])) {
    const category = segments[1]; title = categoryTitle(category) + ' | Premium Dukan'; description = categoryIntro(category); canonical = categoryPath(category);
    content = catalogHtml(snapshot, category, query.get('search') || query.get('q') || ''); schema = structuredData(undefined, category);
  } else if (segments.length === 1 && informationPages[segments[0]]) {
    const page = informationPages[segments[0]]; title = page.title + ' | Premium Dukan'; description = page.description;
    content = `<article class="seo-panel"><nav aria-label="Breadcrumb">${link('/', 'Home')} / ${escapeHtml(page.title)}</nav><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p>${page.sections.map(section => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.text)}</p>${section.link ? link(section.link, section.linkText || 'Learn more') : ''}</section>`).join('')}${helpLinks()}</article>`;
    const data = structuredData(); data['@graph'].push(breadcrumbs([{ name: 'Home', path: '/' }, { name: page.title, path: pathname }])); schema = data;
  } else if (/^\/(login|admin)(\/|$)/.test(pathname)) {
    title = 'Admin sign-in | Premium Dukan'; description = 'Private store administration.'; noindex = true; bootstrap = false; schema = [];
    content = '<section class="state-panel"><h1>Store administration</h1><p>Sign in to access store administration.</p></section>';
  } else {
    status = 404; title = 'Page not found | Premium Dukan'; description = 'This page is unavailable. Browse the current Premium Dukan catalogue.'; noindex = true; schema = []; bootstrap = false;
    content = '<section class="state-panel"><h1>Page not found</h1><p>This page is unavailable.</p><a href="/">Browse subscriptions</a></section>';
  }
  const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}"><link rel="canonical" href="${escapeHtml(SITE + canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(SITE + canonical)}"><meta property="og:type" content="website">${product?.imageUrl ? `<meta property="og:image" content="${escapeHtml(safeImage(product.imageUrl))}">` : ''}<script id="structured-data" type="application/ld+json">${scriptJson(schema)}</script>${config.verification ? `<meta name="google-site-verification" content="${escapeHtml(config.verification)}">` : ''}`;
  const data = bootstrap ? `<script id="storefront-data" type="application/json">${scriptJson({ ...snapshot, path: pathname, analyticsId: config.analyticsId || undefined })}</script>` : '';
  const body = template.replace(/<title[\s\S]*?<\/title>/i, '').replace('</head>', `${head}</head>`).replace(/<app-root[^>]*>[\s\S]*?<\/app-root>/i, `<app-root>${frame(content)}</app-root>${data}`);
  return { status, body, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': noindex || status !== 200 ? 'private, no-store' : 'public, max-age=0, s-maxage=60', ...(noindex ? { 'X-Robots-Tag': 'noindex, follow' } : {}) } };
}
export function sitemap(snapshot: Snapshot): string {
  const pages = ['/', ...Object.keys(informationPages).map(path => '/' + path), ...[...new Set(snapshot.products.map(product => product.category))].map(categoryPath), ...snapshot.products.map(productPath)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(path => `<url><loc>${escapeHtml(SITE + path)}</loc></url>`).join('')}</urlset>`;
}
