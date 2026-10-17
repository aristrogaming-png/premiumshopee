import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { handler } = createRequire(import.meta.url)('./server-handler.cjs');

test('Vercel apex-to-www redirect terminates at the storefront and all SEO URLs use www', async t => {
  const product = { id: '6952c2137a2648fa67f26295', name: 'Test plan', category: 'Software', price: 8, stock: 3, description: 'Saved description', imageUrl: '' };
  const banner = { id: 'live-banner', imageUrl: 'https://example.com/banner.jpg', altText: 'Live offer', targetUrl: 'https://example.com/offer' };
  t.mock.method(globalThis, 'fetch', async (url: string) => ({ ok: true, json: async () => url.endsWith('/api/banners') ? [banner] : [product] }));
  const request = async (url: string, headers: Record<string, string> = {}) => {
    const parsed = new URL(url);
    const result = { status: 0, headers: {} as Record<string, string>, body: '' };
    await handler({ url: parsed.pathname + parsed.search, method: 'GET', headers: { host: parsed.host, ...headers } }, {
      writeHead(status: number, headers: Record<string, string>) { result.status = status; result.headers = headers; },
      end(body: string) { result.body = body; }
    });
    return result;
  };
  // Reproduce the observed Vercel domain rule without calling external services.
  for (const path of ['/', '/product/' + product.id, '/buying-guide', '/?search=Test', '/robots.txt', '/sitemap.xml']) {
    const apex = new URL(path, 'https://premiumdukan.com');
    const edgeLocation = new URL(apex.pathname + apex.search, 'https://www.premiumdukan.com').href;
    const page = await request(edgeLocation);
    assert.equal(page.status, 200, path);
    assert.equal(page.headers.Location, undefined, 'www must not redirect back to the apex');
    assert.ok(!page.body.includes('https://premiumdukan.com'), path);
    assert.ok(page.body.includes('https://www.premiumdukan.com'), path);
  }
  const redirect = await request('https://www.premiumdukan.com/category/Software/');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.Location, '/category/Software');
  assert.equal((await request(new URL(redirect.headers.Location, 'https://www.premiumdukan.com').href)).status, 200);
  const missing = await request('https://www.premiumdukan.com/missing');
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.Location, undefined);

  const usHome = await request('https://www.premiumdukan.com/', { 'x-vercel-ip-country': 'US' });
  const internationalHome = await request('https://www.premiumdukan.com/', { 'x-vercel-ip-country': 'CA' });
  const bootstrap = (body: string) => JSON.parse(body.match(/<script id="storefront-data" type="application\/json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(usHome.headers.Vary, 'x-vercel-ip-country');
  assert.equal(usHome.headers['Cache-Control'], 'private, no-store');
  assert.equal(bootstrap(usHome.body).banners.at(-1).id, 'alice-store-travel-deals-us');
  assert.equal(bootstrap(internationalHome.body).banners.some((item: { id: string }) => item.id === 'alice-store-travel-deals-us'), false);

  const country = await request('https://www.premiumdukan.com/api/visitor-country', { 'x-vercel-ip-country': 'US' });
  assert.deepEqual(JSON.parse(country.body), { countryCode: 'US' });
  assert.equal(country.headers['Cache-Control'], 'no-store');
});
