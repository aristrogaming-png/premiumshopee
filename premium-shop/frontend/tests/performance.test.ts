import "@angular/compiler";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BehaviorSubject,
  defer,
  firstValueFrom,
  NEVER,
  of,
  Subject,
  throwError,
} from "rxjs";
import { convertToParamMap } from "@angular/router";
import { HttpRequest } from "@angular/common/http";
import { ProductService } from "../src/app/services/product.service";
import { AuthInterceptor } from "../src/app/intercepter/auth.interceptor";
import {
  ProductImageDirective,
  PRODUCT_PLACEHOLDER,
} from "../src/app/shared/product-image.directive";
import {
  ProductImagePipe,
  ProductImageSrcsetPipe,
} from "../src/app/shared/product-image.pipe";
import { ProductDetailComponent } from "../src/app/pages/product-detail/product-detail.component";
import { ProductListComponent } from "../src/app/pages/product-list/product-list.component";
import {
  filterCatalog,
  validBannerTarget,
  whatsappUrl,
} from "../src/app/shared/catalog";
import { ThemeService } from "../src/app/services/theme.service";
import { BannerService } from "../src/app/services/banner.service";
import { BannerCarouselComponent } from "../src/app/shared/banner-carousel.component";
import { ImageInputComponent } from "../src/app/shared/image-input.component";
import { HttpEventType } from "@angular/common/http";

const product = {
  id: "1",
  name: "Plan",
  stock: 3,
  price: 10,
  category: "Tools",
  description: "",
  imageUrl: "",
};

test("catalog renders a page immediately and preserves Load More and filtering", () => {
  const products = Array.from({ length: 25 }, (_, index) => ({
    ...product,
    id: String(index),
    category: index < 13 ? "Tools" : "Other",
  }));
  const component = new ProductListComponent(
    { getProducts: () => of(products) } as any,
    { onDestroy: () => () => {} } as any,
    {
      paramMap: of(convertToParamMap({})),
      queryParamMap: of(convertToParamMap({})),
    } as any,
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
  component.selectCategory("Tools");
  assert.equal(component.displayedProducts.length, 12);
  assert.equal(component.filteredProducts.length, 13);
  component.searchTerm = "missing";
  component.onSearchChange();
  assert.deepEqual(component.displayedProducts, []);
});

test("concurrent catalog subscribers and back navigation share one request", async () => {
  const response = new Subject<any[]>();
  let requests = 0;
  const service = new ProductService({
    get: () =>
      defer(() => {
        requests++;
        return response;
      }),
  } as any);
  const first = firstValueFrom(service.getProducts());
  const second = firstValueFrom(service.getProducts());
  response.next([product]);
  response.complete();
  assert.deepEqual(await first, [product]);
  assert.deepEqual(await second, [product]);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.equal(requests, 1);
});

test("expired catalog and successful inventory changes force fresh reads", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  let reads = 0;
  const service = new ProductService({
    get: () =>
      defer(() => {
        reads++;
        return of([product]);
      }),
    post: () => of(product),
    put: () => of(product),
    delete: () => of({ success: true }),
  } as any);
  await firstValueFrom(service.getProducts());
  now += 30_001;
  await firstValueFrom(service.getProducts());
  assert.equal(reads, 2);
  for (const mutate of [
    () => service.createProduct(product),
    () => service.updateProduct(product),
    () => service.deleteProduct(product.id),
  ]) {
    await firstValueFrom(mutate());
    await firstValueFrom(service.getProducts());
  }
  assert.equal(reads, 5);
});

test("failed catalog requests can be retried and filtered reads never replace the full catalog", async () => {
  let calls = 0;
  const service = new ProductService({
    get: (_url: string, options: any) => {
      calls++;
      if (calls === 1) return throwError(() => new Error("offline"));
      return of(options ? [] : [product]);
    },
  } as any);
  await assert.rejects(firstValueFrom(service.getProducts()), /offline/);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.deepEqual(await firstValueFrom(service.getProducts("missing")), []);
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
  assert.equal(calls, 3);
});

test("public reads avoid Authorization preflights, admin writes retain their token", () => {
  const interceptor = new AuthInterceptor(
    { getToken: () => "token" } as any,
    {} as any,
  );
  for (const [method, path, expected] of [
    ["GET", "/api/products", null],
    ["PUT", "/api/products/1", "Bearer token"],
    [
      "GET",
      "https://premiumshopee.onrender.com/api/products?search=plan",
      null,
    ],
    ["GET", "/api/admin", "Bearer token"],
    ["POST", "/api/login", null],
    ["POST", "https://unrelated.example/api/products", null],
  ]) {
    interceptor
      .intercept(new HttpRequest(method, path, null), {
        handle: (req) => {
          assert.equal(req.headers.get("Authorization"), expected);
          return of();
        },
      })
      .subscribe();
  }
});

test("an old in-flight catalog cannot replace the cache after an inventory update", async () => {
  const pending = new Subject<any[]>();
  let reads = 0;
  const updated = { ...product, stock: 0 };
  const service = new ProductService({
    get: () => (++reads === 1 ? pending : of([updated])),
    put: () => of(updated),
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

test("a hung catalog times out and a later retry can succeed", async () => {
  let reads = 0;
  const service = new ProductService({
    get: () => (++reads === 1 ? NEVER : of([product])),
  } as any);
  (service as any).requestTimeoutMs = 10;
  await assert.rejects(firstValueFrom(service.getProducts()), {
    name: "TimeoutError",
  });
  assert.deepEqual(await firstValueFrom(service.getProducts()), [product]);
});

test("details cancel old requests on route changes and recover through Retry", () => {
  const params = new BehaviorSubject(convertToParamMap({ id: "old" }));
  const old = new Subject<any>();
  let tries = 0;
  let destroy: () => void;
  const component = new ProductDetailComponent(
    { paramMap: params } as any,
    {
      getProduct: (id) =>
        id === "old"
          ? old
          : ++tries === 1
            ? throwError(() => new Error("offline"))
            : of(product),
    } as any,
    {
      onDestroy: (callback) => {
        destroy = callback;
        return () => {};
      },
    } as any,
  );
  component.ngOnInit();
  params.next(convertToParamMap({ id: "new" }));
  assert.match(component.errorMsg, /Unable to load/);
  old.next({ ...product, id: "old" });
  assert.equal(component.product, null);
  component.retry();
  assert.equal(component.product, product);
  assert.equal(component.errorMsg, "");
  destroy!();
});

test("only original Cloudinary uploads get responsive transformations", () => {
  const pipe = new ProductImagePipe();
  const srcset = new ProductImageSrcsetPipe();
  const url = "https://res.cloudinary.com/shop/image/upload/v123/photo.png";
  assert.equal(
    pipe.transform(url),
    "https://res.cloudinary.com/shop/image/upload/f_auto,q_auto,c_limit,w_640/v123/photo.png",
  );
  assert.match(srcset.transform(url)!, /w_1280\/v123\/photo.png 1280w/);
  for (const original of [
    "https://example.com/photo.png",
    "https://res.cloudinary.com/shop/image/upload/s--signature--/v123/photo.png",
    "https://res.cloudinary.com/shop/image/upload/c_fill,w_200/v123/photo.png",
  ]) {
    assert.equal(pipe.transform(original), original);
    assert.equal(srcset.transform(original), null);
  }
  assert.equal(pipe.transform(""), PRODUCT_PLACEHOLDER);
});

test("image failures clear srcset, try the original once, and stop at the fallback", () => {
  const directive = new ProductImageDirective();
  directive.appProductImage = "https://example.com/original.png";
  let writes = 0;
  let current = "https://example.com/optimized.png";
  const image = {
    getAttribute: () => current,
    removeAttribute: (name) => assert.equal(name, "srcset"),
    set src(value) {
      writes++;
      current = value;
    },
  } as any;
  directive.onError(image);
  assert.equal(current, directive.appProductImage);
  directive.onError(image);
  assert.equal(current, PRODUCT_PLACEHOLDER);
  directive.onError(image);
  assert.equal(writes, 2);
});

test("all catalog filters compose and stock <= 0 is excluded only when requested", () => {
  const products = [
    {
      ...product,
      id: "a",
      name: "Music annual",
      price: 50,
      durationMonths: 12,
      category: "Music",
    },
    {
      ...product,
      id: "b",
      description: "music plan",
      price: 10,
      durationMonths: 1,
      category: "Music",
      stock: 0,
    },
    {
      ...product,
      id: "c",
      description: "music plan",
      price: 30,
      durationMonths: 12,
      category: "Music",
      stock: -1,
    },
    { ...product, id: "d", name: "Music tools", price: 40, durationMonths: 12 },
    { ...product, id: "e", name: "Music other", price: 80, category: "Music" },
  ];
  const filters = {
    search: "music",
    category: "Music",
    minPrice: 20,
    maxPrice: 60,
    duration: 12,
    inStock: true,
    sort: "default" as const,
  };
  assert.deepEqual(
    filterCatalog(products, filters).map((p) => p.id),
    ["a"],
  );
  assert.deepEqual(
    filterCatalog(products, { ...filters, inStock: false }).map((p) => p.id),
    ["a", "c"],
  );
  assert.deepEqual(
    filterCatalog(products, { ...filters, minPrice: 100 }).map((p) => p.id),
    [],
  );
});

test("sorts use real prices and createdAt, have deterministic ties and preserve default order", () => {
  const products = [
    { ...product, id: "b", price: 20, createdAt: "2025-01-01" },
    { ...product, id: "a", price: 20, createdAt: "2026-01-01" },
    { ...product, id: "c", price: 10 },
  ];
  const filters = {
    search: "",
    category: "",
    minPrice: null,
    maxPrice: null,
    duration: null,
    inStock: false,
    sort: "default" as const,
  };
  assert.deepEqual(
    filterCatalog(products, filters).map((p) => p.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    filterCatalog(products, { ...filters, sort: "price-asc" }).map((p) => p.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    filterCatalog(products, { ...filters, sort: "price-desc" }).map(
      (p) => p.id,
    ),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    filterCatalog(products, { ...filters, sort: "newest" }).map((p) => p.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    products.map((p) => p.id),
    ["b", "a", "c"],
  );
});

function globals(t: any, values: Record<string, any>): void {
  const previous = Object.fromEntries(
    Object.keys(values).map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  for (const [name, value] of Object.entries(values))
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  t.after(() => {
    for (const [name, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
}

test("theme follows system initially, remembers manual choice, and tolerates blocked storage", (t) => {
  let saved: string | null = null;
  let dark = false;
  globals(t, {
    localStorage: {
      getItem: () => saved,
      setItem: (_key, value) => (saved = value),
    },
    document: {
      documentElement: {
        classList: { toggle: (_name, value) => (dark = value) },
      },
    },
    window: { matchMedia: () => ({ matches: true }) },
  });
  const theme = new ThemeService();
  theme.initTheme();
  assert.equal(theme.isDark, true);
  assert.equal(dark, true);
  theme.toggleTheme();
  assert.equal(saved, "light");
  assert.equal(dark, false);
  const reloaded = new ThemeService();
  reloaded.initTheme();
  assert.equal(reloaded.isDark, false);
  t.mock.method(localStorage, "getItem", () => {
    throw Error("blocked");
  });
  t.mock.method(localStorage, "setItem", () => {
    throw Error("blocked");
  });
  assert.doesNotThrow(() => {
    theme.initTheme();
    theme.toggleTheme();
  });
});

test("banner errors and slow banner requests do not block catalog rendering", () => {
  const banners = new Subject<any>();
  const destroy = { onDestroy: () => () => {} } as any;
  const carousel = new BannerCarouselComponent(
    { getBanners: () => banners } as any,
    {} as any,
    destroy,
  );
  const catalog = new ProductListComponent(
    { getProducts: () => of([product]) } as any,
    destroy,
    {
      paramMap: of(convertToParamMap({})),
      queryParamMap: of(convertToParamMap({})),
    } as any,
  );
  carousel.ngOnInit();
  catalog.ngOnInit();
  assert.equal(catalog.isLoading, false);
  assert.equal(catalog.displayedProducts.length, 1);
  assert.equal(carousel.loading, true);
  banners.error(Error("offline"));
  assert.equal(carousel.error, true);
  assert.equal(catalog.displayedProducts.length, 1);
});

test("banner cache deduplicates reads and invalidates on save/delete while admin reads stay fresh", async () => {
  let reads = 0;
  const banner = {
    id: "1",
    imageUrl: "https://example.com/banner.png",
    altText: "Offer",
    targetUrl: "/",
  };
  const service = new BannerService({
    get: () =>
      defer(() => {
        reads++;
        return of([banner]);
      }),
    post: () => of(banner),
    put: () => of(banner),
    delete: () => of({}),
  } as any);
  await firstValueFrom(service.getBanners());
  await firstValueFrom(service.getBanners());
  assert.equal(reads, 1);
  await firstValueFrom(service.save(banner));
  await firstValueFrom(service.getBanners());
  assert.equal(reads, 2);
  await firstValueFrom(service.delete("1"));
  await firstValueFrom(service.getBanners());
  assert.equal(reads, 3);
  await firstValueFrom(service.getAdminBanners());
  await firstValueFrom(service.getAdminBanners());
  assert.equal(reads, 5);
});

test("image selection cancellation and upload failure preserve the previous image", (t) => {
  t.mock.method(URL, "createObjectURL", () => "blob:preview");
  t.mock.method(URL, "revokeObjectURL", () => {});
  let calls = 0;
  const request = new Subject<any>();
  const editor = new ImageInputComponent({
    upload: () => {
      calls++;
      return request;
    },
  } as any);
  editor.value = { imageUrl: "https://example.com/old.png" };
  editor.ngOnChanges();
  const original = editor.value;
  const file = new File(["image"], "test.png", { type: "image/png" });
  editor.selectFile({ target: { files: [file], value: "test.png" } } as any);
  assert.equal(editor.value, original);
  editor.cancelSelection();
  assert.equal(editor.value, original);
  editor.selectFile({ target: { files: [file], value: "test.png" } } as any);
  editor.upload();
  editor.upload();
  assert.equal(calls, 1);
  request.error(Error("offline"));
  assert.equal(editor.value, original);
  assert.equal(editor.uploading, false);
  assert.match(editor.error, /Upload failed/);
  editor.ngOnDestroy();
});

test("successful image upload emits persistent metadata and rejects unsafe pasted URLs", (t) => {
  t.mock.method(URL, "createObjectURL", () => "blob:preview");
  t.mock.method(URL, "revokeObjectURL", () => {});
  const response = {
    secureUrl: "https://example.com/new.png",
    publicId: "premium-dukan/products/new",
    width: 640,
    height: 320,
    format: "png",
  };
  const editor = new ImageInputComponent({
    upload: () => of({ type: HttpEventType.Response, body: response }),
  } as any);
  editor.value = { imageUrl: "https://example.com/old.png" };
  editor.ngOnChanges();
  let result: any;
  editor.valueChange.subscribe((value) => (result = value));
  editor.editUrl("javascript:alert(1)");
  editor.applyUrl();
  assert.equal(result, undefined);
  editor.restoreUrl();
  editor.selectFile({
    target: {
      files: [new File(["image"], "test.png", { type: "image/png" })],
      value: "",
    },
  } as any);
  editor.upload();
  assert.equal(result.imageUrl, response.secureUrl);
  assert.equal(result.imagePublicId, response.publicId);
  assert.equal(editor.selected, undefined);
  assert.equal(editor.uploading, false);
  editor.ngOnDestroy();
});

test("banner destinations reject unsafe navigation and WhatsApp preserves real prices", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.example",
    "http://example.com",
    "/admin",
    "/\\evil.example",
  ])
    assert.equal(validBannerTarget(url), false);
  assert.equal(validBannerTarget("/?category=AI%20Tools"), true);
  const link = new URL(whatsappUrl({ ...product, name: "A & B", price: 12.5 }));
  assert.equal(link.hostname, "wa.me");
  assert.match(link.searchParams.get("text")!, /A & B for \$12.5/);
});


test('sticky category transition reserves its original space and preserves selected filters', t => {
  let intersect: any;
  let disconnected = 0;
  globals(t, {
    ResizeObserver: class { constructor(_callback: any) {} observe() {} disconnect() { disconnected++; } },
    IntersectionObserver: class { constructor(callback: any) { intersect = callback; } observe() {} disconnect() { disconnected++; } },
    requestAnimationFrame: (callback: any) => { callback(); return 1; }, cancelAnimationFrame: () => {}
  });
  const component = new ProductListComponent({} as any, {} as any, {} as any);
  component.marker = {nativeElement:{}} as any;
  component.categorySpace = {nativeElement:{offsetHeight:204}} as any;
  component.categoryNav = {nativeElement:{querySelector:() => null}} as any;
  component.searchTerm = 'music'; component.selectedCategory = 'Music';
  component.ngAfterViewInit();
  intersect([{boundingClientRect:{top:20}}]);
  assert.equal(component.compact,true); assert.equal(component.categoryHeight,204);
  assert.equal(component.searchTerm,'music'); assert.equal(component.selectedCategory,'Music');
  intersect([{boundingClientRect:{top:200}}]); assert.equal(component.compact,false);
  component.ngOnDestroy(); assert.equal(disconnected,2);
});

test('carousel handles empty/single/multiple records and keyboard movement without autorotation', t => {
  globals(t, {matchMedia:() => ({matches:true})});
  const banners = new Subject<any[]>();
  const component = new BannerCarouselComponent({getBanners:() => banners} as any, {} as any, {onDestroy:() => () => {}} as any);
  component.ngOnInit(); banners.next([]); assert.equal(component.banners.length,0);
  const banner = {id:'a',imageUrl:'https://example.com/image.png',altText:'Offer',targetUrl:'/'};
  banners.next([banner]); assert.equal(component.banners.length,1);
  banners.next([banner,{...banner,id:'b'}]); assert.equal(component.banners.length,2);
  const track = {children:[{offsetLeft:0,offsetWidth:108},{offsetLeft:120,offsetWidth:108}],scrollLeft:0,scrollTo(options:any){this.scrollLeft=options.left;}};
  component.track = {nativeElement:track} as any;
  let prevented=false;
  component.step(1,{preventDefault:() => prevented=true} as any); component.onScroll();
  assert.equal(prevented,true); assert.equal(component.active,1); assert.equal(track.scrollLeft,120);
  component.step(-1); component.onScroll(); assert.equal(component.active,0);
  banners.complete();
});
