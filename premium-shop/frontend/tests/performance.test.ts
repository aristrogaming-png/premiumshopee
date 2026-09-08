import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BehaviorSubject, defer, firstValueFrom, NEVER, of, Subject, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { HttpRequest } from '@angular/common/http';
import { ProductService } from '../src/app/services/product.service';
import { AuthInterceptor } from '../src/app/intercepter/auth.interceptor';
import { ProductImageDirective, PRODUCT_PLACEHOLDER } from '../src/app/shared/product-image.directive';
import { ProductImagePipe, ProductImageSrcsetPipe } from '../src/app/shared/product-image.pipe';
import { ProductDetailComponent } from '../src/app/pages/product-detail/product-detail.component';
import { ProductListComponent } from '../src/app/pages/product-list/product-list.component';

const product = { id: '1', name: 'Plan', stock: 3, price: 10, category: 'Tools', description: '', imageUrl: '' };

test('catalog renders a page immediately and preserves Load More and filtering', () => {
  const products = Array.from({ length: 25 }, (_, index) => ({ ...product, id: String(index), category: index < 13 ? 'Tools' : 'Other' }));
  const component = new ProductListComponent(
    { getProducts: () => of(products) } as any,
    { onDestroy: () => () => {} } as any
  );
  component.ngOnInit();
  assert.equal(component.isLoading, false);
  assert.equal(component.displayedProducts.length, 12);
  const firstPage = component.displayedProducts;
  assert.equal(component.displayedProducts, firstPage);
  component.loadMore();
  assert.equal(component.displayedProducts.length, 24);
  component.loadMore();
  assert.equal(component.displayedProducts.length, 25);
  assert.equal(component.hasMoreProducts, false);
  component.selectCategory('Tools');
  assert.equal(component.displayedProducts.length, 12);
  assert.equal(component.filteredProducts.length, 13);
  component.searchTerm = 'missing';
  component.onSearchChange();
  assert.deepEqual(component.displayedProducts, []);
});

test('concurrent catalog subscribers and back navigation share one request', async () => {
  const response = new Subject<any[]>();
  let requests = 0;
  const service = new ProductService({ get: () => defer(() => { requests++; return response; }) } as any);
  const first = firstValueFrom(service.getProducts());
  const second = firstValueFrom(service.getProducts());
  response.next([product]);
  response.complete();
  assert.deepEqual(await first, [product]);
  assert.deepEqual(await second, [product]);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.equal(requests, 1);
});

test('expired catalog and successful inventory changes force fresh reads', async t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  let reads = 0;
  const service = new ProductService({
    get: () => defer(() => { reads++; return of([product]); }),
    post: () => of(product), put: () => of(product), delete: () => of({ success: true })
  } as any);
  await firstValueFrom(service.getProducts());
  now += 30_001;
  await firstValueFrom(service.getProducts());
  assert.equal(reads, 2);
  for (const mutate of [() => service.createProduct(product), () => service.updateProduct(product), () => service.deleteProduct(product.id)]) {
    await firstValueFrom(mutate());
    await firstValueFrom(service.getProducts());
  }
  assert.equal(reads, 5);
});

test('failed catalog requests can be retried and filtered reads never replace the full catalog', async () => {
  let calls = 0;
  const service = new ProductService({ get: (_url: string, options: any) => {
    calls++;
    if (calls === 1) return throwError(() => new Error('offline'));
    return of(options ? [] : [product]);
  } } as any);
  await assert.rejects(firstValueFrom(service.getProducts()), /offline/);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.deepEqual(await firstValueFrom(service.getProducts('missing')), []);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.equal(calls, 3);
});

test('public reads avoid Authorization preflights, admin writes retain their token', () => {
  const interceptor = new AuthInterceptor({ getToken: () => 'token' } as any, {} as any);
  for (const [method, path, expected] of [
    ['GET', '/api/products', null], ['PUT', '/api/products/1', 'Bearer token'],
    ['GET', 'https://premiumshopee.onrender.com/api/products?search=plan', null],
    ['GET', '/api/admin', 'Bearer token'],
    ['POST', '/api/login', null], ['POST', 'https://unrelated.example/api/products', null]
  ]) {
    interceptor.intercept(new HttpRequest(method, path, null), {
      handle: req => { assert.equal(req.headers.get('Authorization'), expected); return of(); }
    }).subscribe();
  }
});

test('an old in-flight catalog cannot replace the cache after an inventory update', async () => {
  const pending = new Subject<any[]>();
  let reads = 0;
  const updated = { ...product, stock: 0 };
  const service = new ProductService({
    get: () => ++reads === 1 ? pending : of([updated]),
    put: () => of(updated)
  } as any);
  const old = firstValueFrom(service.getProducts());
  await firstValueFrom(service.updateProduct(updated));
  assert.deepEqual(await firstValueFrom(service.getProducts()), [updated]);
  pending.next([product]);
  pending.complete();
  await old;
  assert.deepEqual(await firstValueFrom(service.getProducts()), [updated]);
  assert.equal(reads, 2);
});

test('a hung catalog times out and a later retry can succeed', async () => {
  let reads = 0;
  const service = new ProductService({ get: () => ++reads === 1 ? NEVER : of([product]) } as any);
  (service as any).requestTimeoutMs = 10;
  await assert.rejects(firstValueFrom(service.getProducts()), { name: 'TimeoutError' });
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
});

test('details cancel old requests on route changes and recover through Retry', () => {
  const params = new BehaviorSubject(convertToParamMap({ id: 'old' }));
  const old = new Subject<any>();
  let tries = 0;
  let destroy: () => void;
  const component = new ProductDetailComponent(
    { paramMap: params } as any,
    { getProduct: id => id === 'old' ? old : ++tries === 1 ? throwError(() => new Error('offline')) : of(product) } as any,
    { onDestroy: callback => { destroy = callback; return () => {}; } } as any
  );
  component.ngOnInit();
  params.next(convertToParamMap({ id: 'new' }));
  assert.match(component.errorMsg, /Unable to load/);
  old.next({ ...product, id: 'old' });
  assert.equal(component.product, null);
  component.retry();
  assert.equal(component.product, product);
  assert.equal(component.errorMsg, '');
  destroy!();
});

test('only original Cloudinary uploads get responsive transformations', () => {
  const pipe = new ProductImagePipe();
  const srcset = new ProductImageSrcsetPipe();
  const url = 'https://res.cloudinary.com/shop/image/upload/v123/photo.png';
  assert.equal(pipe.transform(url), 'https://res.cloudinary.com/shop/image/upload/f_auto,q_auto,c_limit,w_640/v123/photo.png');
  assert.match(srcset.transform(url)!, /w_1280\/v123\/photo.png 1280w/);
  for (const original of ['https://example.com/photo.png', 'https://res.cloudinary.com/shop/image/upload/s--signature--/v123/photo.png', 'https://res.cloudinary.com/shop/image/upload/c_fill,w_200/v123/photo.png']) {
    assert.equal(pipe.transform(original), original);
    assert.equal(srcset.transform(original), null);
  }
  assert.equal(pipe.transform(''), PRODUCT_PLACEHOLDER);
});

test('image failures clear srcset, try the original once, and stop at the fallback', () => {
  const directive = new ProductImageDirective();
  directive.appProductImage = 'https://example.com/original.png';
  let writes = 0;
  let current = 'https://example.com/optimized.png';
  const image = {
    getAttribute: () => current,
    removeAttribute: name => assert.equal(name, 'srcset'),
    set src(value) { writes++; current = value; }
  } as any;
  directive.onError(image);
  assert.equal(current, directive.appProductImage);
  directive.onError(image);
  assert.equal(current, PRODUCT_PLACEHOLDER);
  directive.onError(image);
  assert.equal(writes, 2);
});
