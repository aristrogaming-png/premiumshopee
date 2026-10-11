import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPage, sitemap, Snapshot } from './render';
import { SITE, categoryPath, productPath, slug } from '../src/app/shared/seo-content';

import { informationPages } from '../src/app/shared/information-content';

const template = readFileSync(join(__dirname, 'shell.html'), 'utf8');
const publicConfig = JSON.parse(readFileSync(join(__dirname, 'public-config.json'), 'utf8'));
const api = process.env.CATALOG_API_ORIGIN || 'https://premium-shop-backend.onrender.com';
let cached: Snapshot | undefined;
let pending: Promise<Snapshot> | undefined;
async function readCatalog(): Promise<Snapshot> {
  if (cached && Date.now() - cached.fetchedAt < 30000) return cached;
  if (pending) return pending;
  pending = (async () => {
    const start = Date.now();
    const response = await fetch(`${api}/api/products`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error(`Catalogue HTTP ${response.status}`);
    const products = await response.json();
    if (!Array.isArray(products) || products.some(item => !/^[a-f\d]{24}$/i.test(item.id) || typeof item.name !== 'string' || typeof item.category !== 'string' || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 || typeof item.stock !== 'number')) throw Error('Invalid catalogue response');
    // The main catalogue never waits for banner requests. Use the last successful banner cache.
    cached = { products, banners: cached?.banners || [], fetchedAt: start };
    return cached;
  })();
  try { return await pending; } finally { pending = undefined; }
}
let bannerCache: { banners: Snapshot['banners']; fetchedAt: number } | undefined;
async function readBanners(): Promise<Snapshot['banners']> {
  if (bannerCache && Date.now() - bannerCache.fetchedAt < 60000) return bannerCache.banners;
  try {
    const response = await fetch(`${api}/api/banners`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return bannerCache?.banners || [];
    const banners = await response.json();
    if (Array.isArray(banners)) bannerCache = { banners, fetchedAt: Date.now() };
  } catch {}
  return bannerCache?.banners || [];
}
const empty: Snapshot = { products: [], banners: [], fetchedAt: 0 };
export async function handler(req: any, res: any): Promise<void> {
  const incoming = new URL(req.url || '/', SITE);
  // Vercel's explicit rewrite provides the matched path. Local preview uses the normal pathname.
  const routed = incoming.searchParams.get('__path');
  let path = routed !== null ? '/' + routed.replace(/^\/+/, '') : incoming.pathname;
  incoming.searchParams.delete('__path');
  const finish = (status: number, headers: Record<string, string>, body = '') => {
    res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...headers });
    res.end(req.method === 'HEAD' ? '' : body);
  };
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) return finish(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
  // Vercel owns domain redirects (apex -> www). Redirecting hosts here can
  // conflict with its domain settings and send visitors into a redirect loop.
  if (/\\|\x00/.test(path) || path.startsWith('//')) return finish(400, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  if (path.length > 1 && path.endsWith('/')) return finish(308, { Location: path.replace(/\/+$/, '') + incoming.search, 'Cache-Control': 'public, max-age=3600' });
  if (path === '/index.html') return finish(308, { Location: '/', 'Cache-Control': 'public, max-age=3600' });
  if (path === '/robots.txt') return finish(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' }, `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
  // Private pages do not fetch or embed catalogue/admin data. AuthGuard and the protected Render API enforce authentication.
  if (/^\/(login|admin)(\/|$)/.test(path) || informationPages[path.slice(1)]) {
    const page = renderPage(template, path, incoming.searchParams, empty, publicConfig);
    return finish(page.status, page.headers, page.body);
  }
  if (path.startsWith('/api/') || /\.(?:js|css|png|jpg|svg|ico|map|woff2?)$/i.test(path)) return finish(404, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  if (path !== '/' && path !== '/sitemap.xml' && !/^\/(product|category)\//.test(path)) {
    const page = renderPage(template, path, incoming.searchParams, empty, publicConfig);
    return finish(page.status, page.headers, page.body);
  }
  try {
    const start = performance.now();
    // Banners are independent and time-bounded. Product/detail and help pages need no banner request.
    const bannerRequest = path === '/' ? readBanners() : Promise.resolve([]);
    const snapshot = await readCatalog();
    const banners = await bannerRequest;
    const data = { ...snapshot, banners };
    const timing = `catalog;dur=${(performance.now() - start).toFixed(1)}`;
    if (path === '/sitemap.xml') return finish(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=60', 'Server-Timing': timing }, sitemap(data));
    let decoded: string;
    try { decoded = decodeURIComponent(path); } catch { return finish(400, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }); }
    const aliasProduct = data.products.find(product => decoded === `/product/${product.id}/${slug(product.name)}` || decoded === `/product/${product.id.toUpperCase()}`);
    if (aliasProduct && path !== productPath(aliasProduct)) return finish(308, { Location: productPath(aliasProduct), 'Cache-Control': 'public, max-age=0, s-maxage=60' });
    if (decoded.startsWith('/category/')) {
      const value = decoded.slice('/category/'.length);
      const category = data.products.map(product => product.category).find(category => value === slug(category) || value.toLowerCase() === category.toLowerCase());
      if (category && path !== categoryPath(category)) return finish(308, { Location: categoryPath(category), 'Cache-Control': 'public, max-age=0, s-maxage=60' });
    }
    const page = renderPage(template, path, incoming.searchParams, data, publicConfig);
    finish(page.status, { ...page.headers, 'Server-Timing': timing }, page.body);
  } catch {
    // Do not turn a backend outage into indexable empty products or a false 404.
    const page = renderPage(template, '/temporarily-unavailable', new URLSearchParams(), empty, publicConfig);
    const body = page.body.replace(/Page not found/g, 'Store temporarily unavailable').replace(/This page is unavailable\./g, 'Please retry shortly. The catalogue service is temporarily unavailable.');
    finish(503, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30', 'X-Robots-Tag': 'noindex' }, body);
  }
}
