import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstValueFrom, of } from 'rxjs';
import { BannerService } from '../src/app/services/banner.service';
import { bootstrapData } from '../src/app/shared/bootstrap-data';

test('returning home from a server-rendered detail or category page fetches banners', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { getElementById: () => ({ textContent: JSON.stringify({
      products: [], banners: [], fetchedAt: Date.now(), path: '/product/123'
    }) }) }
  });
  try {
    const initial = bootstrapData()!;
    const banners = [{ id: 'banner', imageUrl: 'https://example.com/banner.jpg' }];
    for (const path of ['/product/123', '/category/Software']) {
      initial.path = path;
      let reads = 0;
      const service = new BannerService({ get: () => { reads++; return of(banners); } } as any);
      assert.deepEqual(await firstValueFrom(service.getBanners()), banners);
      assert.deepEqual(await firstValueFrom(service.getBanners()), banners);
      assert.equal(reads, 1, path + ' must fetch and then cache real banners');
    }
    initial.path = '/';
    const home = new BannerService({ get: () => { throw Error('Homepage bootstrap already contains fetched banners'); } } as any);
    assert.deepEqual(await firstValueFrom(home.getBanners()), []);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
