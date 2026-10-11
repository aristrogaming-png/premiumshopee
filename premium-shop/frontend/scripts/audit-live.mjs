import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('../../seo/evidence/', import.meta.url));
await mkdir(output, { recursive: true });
const origin = process.env.AUDIT_ORIGIN || 'https://premiumdukan.com';
const api = 'https://premium-shop-backend.onrender.com';
async function read(url, redirect = 'follow') {
  const start = performance.now();
  try {
    const response = await fetch(url, { redirect, signal: AbortSignal.timeout(95000) });
    const ttfb = performance.now() - start;
    const body = await response.text();
    return { url, finalUrl: response.url, status: response.status, headers: Object.fromEntries(response.headers), ttfbMs: Math.round(ttfb), totalMs: Math.round(performance.now() - start), bytes: Buffer.byteLength(body), body };
  } catch (error) { return { url, error: error.message }; }
}
const catalog = await read(`${api}/api/products`);
if (catalog.status !== 200) throw Error(JSON.stringify(catalog));
const products = JSON.parse(catalog.body);
await writeFile(`${output}/catalog.json`, JSON.stringify(products, null, 2));
const paths = ['/', '/robots.txt', '/sitemap.xml', `/product/${products[0].id}`, `/category/${encodeURIComponent(products[0].category)}`, '/definitely-missing-seo-audit', '/product/000000000000000000000000', '/login', '/admin', '/?search=test'];
const results = await Promise.all(paths.map(path => read(origin + path)));
results.push(...await Promise.all(['http://premiumdukan.com/', 'https://www.premiumdukan.com/', `${api}/api/admin/banners`, `${api}/api/products/000000000000000000000000`].map(url => read(url, 'manual'))));
results.push(catalog);
const report = results.map(({ body = '', ...result }) => ({ ...result, title: body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(), h1Count: (body.match(/<h1\b/gi) || []).length, links: (body.match(/<a\b[^>]*href=/gi) || []).length, canonical: body.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || null, metaDescription: body.match(/<meta[^>]*name=["']description["'][^>]*>/i)?.[0] || null, jsonLdCount: (body.match(/application\/ld\+json/g) || []).length }));
await writeFile(`${output}/baseline.json`, JSON.stringify({ measuredAt: new Date().toISOString(), kind: 'HTTP lab probes from local machine; not Core Web Vitals', results: report }, null, 2));
await writeFile(`${output}/baseline-home.html`, results[0].body || '');
console.log(JSON.stringify({ catalog: products.map(p => ({ id:p.id, name:p.name, category:p.category, price:p.price, durationMonths:p.durationMonths, description:p.description })), pages: report.map(({ url,status,ttfbMs,bytes,h1Count,links,canonical,metaDescription,headers }) => ({url,status,ttfbMs,bytes,h1Count,links,canonical,metaDescription,location:headers?.location,contentType:headers?.['content-type']})) }, null, 2));
