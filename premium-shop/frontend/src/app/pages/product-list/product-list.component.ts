import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { combineLatest } from "rxjs";
import { ProductService } from "../../services/product.service";
import { Product } from "../../models/product";
import { ProductImageDirective } from "../../shared/product-image.directive";
import {
  ProductImagePipe,
  ProductImageSrcsetPipe,
} from "../../shared/product-image.pipe";
import { ThemeToggleComponent } from "../../shared/theme-toggle.component";
import { BannerCarouselComponent } from "../../shared/banner-carousel.component";
import {
  CatalogSort,
  categoryIcon,
  filterCatalog,
  whatsappUrl,
} from "../../shared/catalog";

@Component({
  selector: "app-product-list",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ProductImageDirective,
    ProductImagePipe,
    ProductImageSrcsetPipe,
    ThemeToggleComponent,
    BannerCarouselComponent,
  ],
  templateUrl: "./product-list.component.html",
  styleUrls: ["./product-list.component.css"],
})
export class ProductListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("categoryMarker") marker?: ElementRef<HTMLElement>;
  @ViewChild("categorySpace") categorySpace?: ElementRef<HTMLElement>;
  @ViewChild("categoryNav") categoryNav?: ElementRef<HTMLElement>;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  searchTerm = "";
  categories: string[] = [];
  durations: number[] = [];
  selectedCategory = "";
  minPrice: number | null = null;
  maxPrice: number | null = null;
  duration: number | null = null;
  inStockOnly = false;
  sort: CatalogSort = "default";
  isLoading = true;
  errorMsg = "";
  compact = false;
  categoryHeight = 205;
  readonly pageSize = 12;
  visibleCount = this.pageSize;
  readonly icon = categoryIcon;
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private frame = 0;
  constructor(
    private productService: ProductService,
    private destroyRef: DestroyRef,
    private route: ActivatedRoute,
  ) {}
  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        this.selectedCategory =
          params.get("category") || query.get("category") || "";
        this.applyFilters();
      });
    this.fetchProducts();
  }
  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.compact && this.categorySpace)
        this.categoryHeight = this.categorySpace.nativeElement.offsetHeight;
    });
    this.resizeObserver.observe(this.categorySpace!.nativeElement);
    this.observer = new IntersectionObserver(
      (entries) => {
        const compact = entries[0].boundingClientRect.top < 64;
        if (compact !== this.compact) {
          if (compact)
            this.categoryHeight =
              this.categorySpace!.nativeElement.offsetHeight;
          this.compact = compact;
          if (compact) this.revealCategory();
        }
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: [0, 1] },
    );
    this.observer.observe(this.marker!.nativeElement);
  }
  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.frame);
  }
  get hasMoreProducts(): boolean {
    return this.visibleCount < this.filteredProducts.length;
  }
  get invalidPriceRange(): boolean {
    return (
      this.minPrice != null &&
      this.maxPrice != null &&
      this.minPrice > this.maxPrice
    );
  }
  fetchProducts(): void {
    this.isLoading = true;
    this.errorMsg = "";
    this.productService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.products = data;
          this.categories = Array.from(
            new Set(data.map((product) => product.category).filter(Boolean)),
          );
          this.durations = Array.from(
            new Set(
              data
                .map((product) => product.durationMonths)
                .filter(
                  (months): months is number =>
                    typeof months === "number" && months > 0,
                ),
            ),
          ).sort((a, b) => a - b);
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.errorMsg = "Unable to load subscriptions. Please try again.";
          this.isLoading = false;
        },
      });
  }
  onSearchChange(): void {
    this.applyFilters();
  }
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
    this.revealCategory();
  }
  resetFilters(): void {
    this.searchTerm = "";
    this.selectedCategory = "";
    this.minPrice = null;
    this.maxPrice = null;
    this.duration = null;
    this.inStockOnly = false;
    this.sort = "default";
    this.applyFilters();
    this.revealCategory();
  }
  applyFilters(): void {
    this.filteredProducts = filterCatalog(this.products, {
      search: this.searchTerm,
      category: this.selectedCategory,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      duration: this.duration,
      inStock: this.inStockOnly,
      sort: this.sort,
    });
    this.visibleCount = this.pageSize;
    this.updateDisplayedProducts();
  }
  loadMore(): void {
    this.visibleCount += this.pageSize;
    this.updateDisplayedProducts();
  }
  private updateDisplayedProducts(): void {
    this.displayedProducts = this.filteredProducts.slice(0, this.visibleCount);
  }
  private revealCategory(): void {
    if (!this.categoryNav) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const nav = this.categoryNav!.nativeElement;
      const active = nav.querySelector('[aria-pressed="true"]') as HTMLElement;
      if (active)
        nav.scrollTo({
          left: Math.max(
            0,
            active.offsetLeft -
              nav.offsetLeft -
              (nav.clientWidth - active.clientWidth) / 2,
          ),
          behavior: "auto",
        });
    });
  }
  trackProduct(_index: number, product: Product): string {
    return product.id;
  }
  buyNow(product: Product): void {
    if (product.stock > 0)
      window.open(whatsappUrl(product), "_blank", "noopener,noreferrer");
  }
}
