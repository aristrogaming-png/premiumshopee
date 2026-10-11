import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPage, sitemap, scriptJson, escapeHtml } from '../server/render';
import { categoryPath } from '../src/app/shared/seo-content';
import { productInfo, productFactGroups, productFaqs, structuredData } from '../src/app/shared/product-content';
import { informationPages } from '../src/app/shared/information-content';
import { productImageSrcset, DETAIL_IMAGE_SIZES, RELATED_IMAGE_SIZES } from '../src/app/shared/product-image-source';
const template = '<html><head><title>Old</title></head><body><app-root></app-root><script src="main.js"></script></body></html>';
const product = { id:'6952c2137a2648fa67f26295', name:'Windows 11 Pro', price:8, stock:3, category:'Software', imageUrl:'https://example.com/art.jpg', description:'', durationMonths:12 };
const snapshot = { products:[product], banners:[], fetchedAt:Date.now() };
const render = (path: string, query = '', data = snapshot) => renderPage(template, path, new URLSearchParams(query), data);

test('initial product HTML preserves signed, transformed and external image URLs without false size candidates', () => {
  for (const imageUrl of [
    'https://res.cloudinary.com/shop/image/upload/s--signature--/v123/product.jpg',
    'https://res.cloudinary.com/shop/image/upload/w_800/v123/product.jpg',
    'https://res.cloudinary.com/shop/image/upload/v123/product.jpg?token=abc',
    'https://example.com/res.cloudinary.com/product.jpg',
  ]) {
    const item = { ...product, imageUrl };
    const page = render('/product/' + item.id, '', { ...snapshot, products: [item] });
    const image = page.body.match(/<img\b[^>]*>/)![0];
    assert.ok(image.includes(`src="${imageUrl}"`));
    assert.ok(!image.includes('srcset='), imageUrl);
  }
});

test('hero and related artwork share responsive sources with the client and use their own layout sizes', () => {
  const imageUrl = 'https://res.cloudinary.com/shop/image/upload/v123/product.jpg';
  const item = { ...product, imageUrl };
  const related = { ...item, id: '6952c2137a2648fa67f26296' };
  const page = render('/product/' + item.id, '', { ...snapshot, products: [item, related] });
  const images = page.body.match(/<img\b[^>]*>/g)!;
  assert.equal(images.length, 2);
  for (const image of images) assert.ok(image.includes(`srcset="${productImageSrcset(imageUrl)}"`));
  assert.ok(images[0].includes(`sizes="${DETAIL_IMAGE_SIZES}"`));
  assert.ok(images[0].includes('fetchpriority="high"'));
  assert.ok(images[1].includes(`sizes="${RELATED_IMAGE_SIZES}"`));
  assert.ok(images[1].includes('loading="lazy"'));
});

test('catalogue image loading prioritizes only the leading image and keeps the rest lazy', () => {
  const products = Array.from({ length: 25 }, (_, index) => ({ ...product, id: index.toString(16).padStart(24, '0') }));
  const data = { ...snapshot, products };
  const images = render('/', '', data).body.match(/<img\b[^>]*>/g)!;
  assert.equal(images.length, 25);
  assert.ok(images[0].includes('loading="eager"'));
  assert.ok(images.slice(1).every(image => image.includes('loading="lazy"') && !image.includes('fetchpriority="high"')));
  const bannerData = { ...data, banners: [{ id: 'offer', title: 'Offer', imageUrl: 'https://res.cloudinary.com/shop/image/upload/v123/banner.jpg', altText: 'Offer', targetUrl: '/', sortOrder: 0, isActive: true }] };
  const homeImages = renderPage(template, '/', new URLSearchParams(), bannerData).body.match(/<img\b[^>]*>/g)!;
  assert.equal(homeImages.length, 26);
  assert.ok(homeImages[0].includes('loading="eager"'));
  assert.ok(homeImages[0].includes('w_960/v123/banner.jpg'));
  assert.ok(homeImages[0].includes('srcset='));
  assert.ok(homeImages.slice(1).every(image => image.includes('loading="lazy"')));
  const categoryImages = renderPage(template, '/category/Software', new URLSearchParams(), bannerData).body.match(/<img\b[^>]*>/g)!;
  assert.equal(categoryImages.length, 25);
  assert.ok(categoryImages[0].includes('loading="eager"'));
});
test('product response contains title, H1, offer and crawlable breadcrumbs without JavaScript', () => {
  const page = render('/product/' + product.id);
  assert.equal(page.status, 200);
  assert.equal((page.body.match(/<h1>/g) || []).length, 1);
  assert.match(page.body, /Windows 11 Pro \| Premium Dukan/);
  assert.match(page.body, /href="\/category\/Software"/);
  assert.match(page.body, /<small>USD<\/small> \$8/);
  assert.match(page.body, /fetchpriority="high"/);
  const schema = JSON.parse(page.body.match(/id="structured-data"[^>]*>(.*?)<\/script>/)![1]);
  const offer = schema['@graph'].find((node: any) => node['@type'] === 'Product').offers;
  assert.equal(offer.price, product.price);
  assert.equal(offer.priceCurrency, 'USD');
  assert.match(offer.availability, /InStock$/);
  assert.equal(offer.hasMerchantReturnPolicy, undefined);
  assert.equal(schema['@graph'].some((node: any) => node.aggregateRating), false);
});
test('category pages show their own heading, copy, canonical and product links', () => {
  const page = render(categoryPath('Software'));
  assert.equal(page.status, 200);
  assert.match(page.body, /Software and productivity subscriptions/);
  assert.match(page.body, new RegExp('href="/product/' + product.id + '"'));
  assert.match(page.body, /rel="canonical" href="https:\/\/premiumdukan.com\/category\/Software"/);
});
test('catalogue HTML links to all products beyond the client initial batch', () => {
  const products = Array.from({length:25}, (_, i) => ({...product, id: i.toString(16).padStart(24,'0')}));
  const page = render('/', '', {...snapshot, products});
  for (const item of products) assert.ok(page.body.includes('href="/product/' + item.id + '"'));
});
test('missing pages and deleted products are true noindex 404s, never home redirects', () => {
  for (const path of ['/missing', '/product/deleted', '/category/missing', '/cart', '/checkout', '/account', '/in', '/us', '/uk']) {
    const page = render(path); assert.equal(page.status,404); assert.match(page.headers['X-Robots-Tag'],/noindex/);
  }
});
test('search is noindex, canonicalized and escaped; category-query links redirect permanently', () => {
  const page = render('/', 'search=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  assert.match(page.headers['X-Robots-Tag'], /noindex/);
  assert.ok(!page.body.includes('<script>alert(1)</script>'));
  const redirect = render('/', 'category=Software');
  assert.equal(redirect.status,308); assert.equal(redirect.headers.Location,'/category/Software');
});
test('private HTML contains no catalogue payload and cannot be cached', () => {
  for (const path of ['/admin', '/admin/edit/' + product.id, '/login']) {
    const page = render(path);
    assert.match(page.headers['Cache-Control'], /no-store/);
    assert.match(page.headers['X-Robots-Tag'], /noindex/);
    assert.ok(!page.body.includes('storefront-data'));
    assert.ok(!page.body.includes(product.name));
  }
});
test('JSON-LD and initial data cannot break out of a script or HTML attribute', () => {
  const hostile = {...product,name:'</script><script>alert(1)</script>',seoDescription:'" onload="evil()', imageUrl:'javascript:alert(1)'};
  const page = render('/product/' + product.id, '', {...snapshot, products:[hostile]});
  assert.ok(!page.body.includes('</script><script>alert(1)</script>'));
  assert.ok(!page.body.includes('src="javascript:'));
  assert.ok(!scriptJson(hostile).includes('<'));
});
test('unsupported policy and renewal are not fabricated; sold-out offer matches visible stock', () => {
  const info = productInfo(product);
  assert.equal(info.eligibility, '');
  assert.equal(info.refund, '');
  assert.equal(info.renewal, '');
  const sold = render('/product/' + product.id, '', {...snapshot, products:[{...product,stock:0}]});
  assert.match(sold.body,/OutOfStock/);
  assert.ok(!sold.body.includes('class="detail-buy" data-product-id'));
});
test('sitemap contains only canonical public URLs and includes all real categories and products', () => {
  const xml = sitemap(snapshot);
  assert.match(xml,/http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9/);
  assert.ok(xml.includes('https://premiumdukan.com/product/' + product.id));
  assert.ok(xml.includes('https://premiumdukan.com/category/Software'));
  assert.ok(!/\/admin|\/login|\/checkout|hreflang|\/in\//.test(xml));
});
test('all help pages have real headings, visible content and no invented ratings', () => {
  for (const path of Object.keys(informationPages)) {
    const page = render('/' + path);
    assert.equal(page.status,200);
    assert.equal((page.body.match(/<h1>/g)||[]).length,1);
    assert.ok(!page.body.includes('aggregateRating'));
  }
});
test('every product in the audited live catalogue renders matching price and stock with related links', () => {
  const products = JSON.parse(readFileSync('../seo/evidence/catalog.json','utf8'));
  for (const item of products) {
    const page = renderPage(template,'/product/' + item.id,new URLSearchParams(),{...snapshot,products});
    assert.equal(page.status,200);
    const schema = structuredData(item)['@graph'] as any[];
    assert.equal(schema.find(node => node['@type'] === 'Product').offers.price,item.price);
    if (item.description?.trim()) assert.ok(page.body.includes(`<div class="detail-description-copy">${escapeHtml(item.description)}</div>`));
    assert.ok(page.body.includes('Frequently asked questions'));
  }
});

test('saved description remains visible in full, including emojis, blank lines and literal HTML', () => {
  const description = '▶️ YouTube Premium Individual — 12 Months\n\n✅ Direct Activation Link\n✅ Background Play\n\n🛡️ 6-Month Warranty\nRefund or replacement if access stops within 6 months.\n' + 'More supplied details. '.repeat(30) + '\n<script>alert("test")</script>';
  for (const id of [product.id, '6ac153b6281a3af6d2a7ab0']) {
    const item = { ...product, id, description, seoDescription: 'A separate short summary.' };
    const page = render('/product/' + id, '', { ...snapshot, products: [item] });
    assert.ok(page.body.includes(`<div class="detail-description-copy">${escapeHtml(description)}</div>`));
    assert.ok(!page.body.includes('<script>alert("test")</script>'));
    assert.equal(productInfo(item).description, description);
    assert.equal(productInfo(item).summary, item.seoDescription);
    assert.ok(!page.body.includes('Not specified for this offer'));
  }
});

test('only saved optional fields produce detail cards and FAQs, including for old catalogue IDs', () => {
  const item = { ...product, description: 'My current product description.', durationMonths: undefined };
  assert.deepEqual(productFactGroups(item), []);
  assert.deepEqual(productInfo(item).features, []);
  assert.equal(productInfo(item).summary, item.description);
  assert.ok(!productFaqs(item).some(faq => faq.question.startsWith('How is')));
  const page = render('/product/' + item.id, '', { ...snapshot, products: [item] });
  assert.ok(!page.body.includes('class="detail-fact-grid"'));
  const populated = { ...item, activation: 'Use your saved activation link.', warrantyTerms: '6-month warranty.' };
  assert.deepEqual(productFactGroups(populated), [
    { title: 'Plan & activation', items: [{ label: 'Activation', value: populated.activation }] },
    { title: 'Before you order', items: [{ label: 'Warranty', value: populated.warrantyTerms }] },
  ]);
});

test('global buying guide replaces country targeting and preserves old links with a permanent redirect', () => {
  const moved = render('/buying-from-india-usa-uk');
  assert.equal(moved.status, 308);
  assert.equal(moved.headers.Location, '/buying-guide');
  assert.ok(sitemap(snapshot).includes('https://premiumdukan.com/buying-guide'));
  assert.ok(!sitemap(snapshot).includes('buying-from-india-usa-uk'));
  for (const path of ['/', '/product/' + product.id, ...Object.keys(informationPages).map(path => '/' + path)]) {
    const page = render(path);
    assert.equal(page.status, 200);
    assert.ok(!/\bIndia\b|\bUSA\b|\bUK\b|buying-from-india-usa-uk|selected_country/.test(page.body), path);
  }
});

test('product details expose plan groups, FAQs and linked related artwork in the initial HTML', () => {
  const other = { ...product, id: '6952c2137a2648fa67f26296', name: 'Another plan' };
  const page = render('/product/' + product.id, '', { ...snapshot, products: [product, other] });
  assert.match(page.body, /class="detail-hero"/);
  assert.match(page.body, /class="detail-fact-grid"/);
  assert.match(page.body, /class="detail-related-card" href="\/product\/6952c2137a2648fa67f26296"/);
  assert.match(page.body, /id="faq-title"/);
  assert.match(page.body, /href="\/buying-guide"/);
});
