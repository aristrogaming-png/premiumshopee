import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstValueFrom, of } from 'rxjs';
import { BannerService } from '../src/app/services/banner.service';
import { bootstrapData } from '../src/app/shared/bootstrap-data';
import { US_TRAVEL_BANNER } from '../src/app/models/banner';

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
      const service = new BannerService({ get: (url: string) => {
        reads++;
        return of(url.endsWith('/api/visitor-country') ? {} : banners);
      } } as any);
      assert.deepEqual(await firstValueFrom(service.getBanners()), banners);
      assert.deepEqual(await firstValueFrom(service.getBanners()), banners);
      assert.equal(reads, 2, path + ' must fetch banners and visitor country once');
    }
    initial.path = '/';
    const home = new BannerService({ get: () => { throw Error('Homepage bootstrap already contains fetched banners'); } } as any);
    assert.deepEqual(await firstValueFrom(home.getBanners()), []);
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('visitor country controls the travel banner and keeps it last', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { getElementById: () => ({ textContent: JSON.stringify({
      products: [], banners: [], fetchedAt: Date.now(), path: '/product/123'
    }) }) }
  });
  try {
    bootstrapData()!.path = '/product/123';
    const regularBanners = [
      { id: 'first', imageUrl: 'https://example.com/first.jpg' },
      { id: 'last', imageUrl: 'https://example.com/last.jpg' },
    ];
    for (const [countryCode, shouldInclude] of [['US', true], ['CA', false]] as const) {
      const service = new BannerService({ get: (url: string) => of(
        url.endsWith('/api/visitor-country') ? { countryCode } : regularBanners,
      ) } as any);
      const banners = await firstValueFrom(service.getBanners());
      assert.equal(banners.some(banner => banner.id === US_TRAVEL_BANNER.id), shouldInclude);
      if (shouldInclude) assert.equal(banners.at(-1)?.id, US_TRAVEL_BANNER.id);
    }
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
