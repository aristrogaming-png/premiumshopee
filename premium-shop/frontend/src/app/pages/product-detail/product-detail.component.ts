import { Component, DestroyRef, OnInit, Optional } from "@angular/core";
import { CommonModule } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, of, startWith, Subject, switchMap, tap } from "rxjs";
import { ProductImageDirective } from "../../shared/product-image.directive";
import { DETAIL_IMAGE_SIZES, RELATED_IMAGE_SIZES } from '../../shared/product-image-source';
import {
  ProductImagePipe,
  ProductImageSrcsetPipe,
} from "../../shared/product-image.pipe";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { ProductService } from "../../services/product.service";
import { Product } from "../../models/product";
import { whatsappUrl } from "../../shared/catalog";
import { SeoService } from '../../services/seo.service';
import { AnalyticsService } from '../../services/analytics.service';
import { categoryPath, categoryTitle, PAYMENT_NOTE } from '../../shared/seo-content';
import { productInfo, productFactGroups, productFaqs, productMetadata, structuredData } from '../../shared/product-content';

@Component({
  selector: "app-product-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProductImageDirective,
    ProductImagePipe,
    ProductImageSrcsetPipe,
  ],
  templateUrl: "./product-detail.component.html",
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  errorMsg = "";
  notFound = false;
  catalog: Product[] = [];
  readonly categoryPath = categoryPath;
  readonly categoryTitle = categoryTitle;
  readonly productInfo = productInfo;
  readonly detailImageSizes = DETAIL_IMAGE_SIZES;
  readonly relatedImageSizes = RELATED_IMAGE_SIZES;
  readonly productFactGroups = productFactGroups;
  readonly productFaqs = productFaqs;
  readonly paymentNote = PAYMENT_NOTE;
  get related(): Product[] { return this.catalog.filter(item => item.id !== this.product?.id && item.category === this.product?.category).slice(0, 4); }
  private readonly retryRequest = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private destroyRef: DestroyRef,
    @Optional() private seo: SeoService | null = null,
    @Optional() private analytics: AnalyticsService | null = null,
  ) {}

  ngOnInit(): void {
    if (this.productService.getProducts) this.productService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: items => this.catalog = items, error: () => {} });
    this.route.paramMap
      .pipe(
        switchMap((params) =>
          this.retryRequest.pipe(
            startWith(undefined),
            tap(() => {
              this.product = null;
              this.errorMsg = "";
              this.notFound = false;
            }),
            switchMap(() =>
              this.productService.getProduct(params.get("id")!).pipe(
                catchError((error) => {
                  this.notFound = error.status === 404 || error.status === 400;
                  this.errorMsg =
                    this.notFound ? 'Product not found. Browse the current catalogue.' : "Unable to load this product. Please try again.";
                  this.seo?.set(this.notFound ? 'Product not found | Premium Dukan' : 'Product temporarily unavailable | Premium Dukan', this.errorMsg, '/product/' + params.get('id'), true, []);
                  return of(null);
                }),
              ),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((product) => {
        this.product = product;
        if (product) {
          const meta = productMetadata(product);
          this.seo?.set(meta.title, meta.description, meta.path, false, structuredData(product), product.imageUrl);
          this.analytics?.event('view_item', product);
        }
      });
  }

  retry(): void {
    this.retryRequest.next();
  }

  buyNow(): void {
    if (!this.product || this.product.stock <= 0) return;
    this.analytics?.event('whatsapp_click', this.product);
    this.analytics?.event('begin_checkout', this.product);
    window.open(whatsappUrl(this.product), "_blank", "noopener,noreferrer");
  }
}
