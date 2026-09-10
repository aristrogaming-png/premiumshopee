import { Component, DestroyRef, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, of, startWith, Subject, switchMap, tap } from "rxjs";
import { ProductImageDirective } from "../../shared/product-image.directive";
import {
  ProductImagePipe,
  ProductImageSrcsetPipe,
} from "../../shared/product-image.pipe";
import { ActivatedRoute } from "@angular/router";
import { ProductService } from "../../services/product.service";
import { Product } from "../../models/product";
import { whatsappUrl } from "../../shared/catalog";

@Component({
  selector: "app-product-detail",
  standalone: true,
  imports: [
    CommonModule,
    ProductImageDirective,
    ProductImagePipe,
    ProductImageSrcsetPipe,
  ],
  templateUrl: "./product-detail.component.html",
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  errorMsg = "";
  private readonly retryRequest = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) =>
          this.retryRequest.pipe(
            startWith(undefined),
            tap(() => {
              this.product = null;
              this.errorMsg = "";
            }),
            switchMap(() =>
              this.productService.getProduct(params.get("id")!).pipe(
                catchError(() => {
                  this.errorMsg =
                    "Unable to load this product. Please try again.";
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
      });
  }

  retry(): void {
    this.retryRequest.next();
  }

  buyNow(): void {
    if (!this.product || this.product.stock <= 0) return;
    window.open(whatsappUrl(this.product), "_blank", "noopener,noreferrer");
  }
}
