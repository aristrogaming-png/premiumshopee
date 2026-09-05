import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {

  products: Product[] = [];
  filteredProducts: Product[] = [];

  searchTerm = '';
  categories: string[] = [];
  selectedCategory = '';

  isLoading = true;
  errorMsg = '';

  // Show only 12 products initially
  visibleCount = 12;
  readonly pageSize = 12;

  // Progressive image loading
  imageAllowed = new Set<string>();

  private imageQueue: string[] = [];
  private loadingImageId: string | null = null;

  private imageStartTimer?: ReturnType<typeof setTimeout>;
  private nextImageTimer?: ReturnType<typeof setTimeout>;

  // WhatsApp number
  private phoneNumber = '918247276831';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.fetchProducts();
  }

  ngOnDestroy(): void {
    if (this.imageStartTimer) {
      clearTimeout(this.imageStartTimer);
    }

    if (this.nextImageTimer) {
      clearTimeout(this.nextImageTimer);
    }
  }

  // Only show first 12 products
  get displayedProducts(): Product[] {
    return this.filteredProducts.slice(0, this.visibleCount);
  }

  // Check if more products exist
  get hasMoreProducts(): boolean {
    return this.visibleCount < this.filteredProducts.length;
  }

  fetchProducts(): void {

    this.isLoading = true;
    this.errorMsg = '';

    this.productService.getProducts().subscribe({

      next: (data) => {

        this.products = data;

        this.categories = Array.from(
          new Set(this.products.map(p => p.category))
        );

        this.applyFilters(false);

        // IMPORTANT:
        // Text/data becomes visible immediately
        this.isLoading = false;

        // Images start afterwards
        this.startProgressiveImageLoading();
      },

      error: () => {

        this.errorMsg =
          'Failed to load products. Please try again.';

        this.isLoading = false;
      }

    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  selectCategory(category: string): void {

    this.selectedCategory = category;

    this.applyFilters();
  }

  applyFilters(restartImages = true): void {

    const search =
      this.searchTerm.trim().toLowerCase();

    this.filteredProducts =
      this.products.filter(product => {

        const matchesSearch =
          !search ||
          product.name
            .toLowerCase()
            .includes(search) ||
          product.description
            .toLowerCase()
            .includes(search);

        const matchesCategory =
          !this.selectedCategory ||
          product.category ===
          this.selectedCategory;

        return (
          matchesSearch &&
          matchesCategory
        );
      });

    // Reset to first 12 when searching/filtering
    this.visibleCount = this.pageSize;

    if (
      restartImages &&
      !this.isLoading
    ) {
      this.startProgressiveImageLoading();
    }
  }

  // Load next 12 products
  loadMore(): void {

    this.visibleCount += this.pageSize;

    this.startProgressiveImageLoading();
  }

  // HTML uses this to know if img tag should exist
  isImageAllowed(
    productId: string
  ): boolean {

    return this.imageAllowed.has(
      productId
    );
  }

  /*
   * IMAGE SYSTEM
   *
   * 1. Text appears first
   * 2. Wait 350ms
   * 3. Allow ONE image
   * 4. Wait until it finishes
   * 5. Allow next image
   */
  private startProgressiveImageLoading(): void {

    if (this.imageStartTimer) {
      clearTimeout(
        this.imageStartTimer
      );
    }

    if (this.nextImageTimer) {
      clearTimeout(
        this.nextImageTimer
      );
    }

    // Only queue images currently visible
    this.imageQueue =
      this.displayedProducts
        .filter(
          product =>
            !this.imageAllowed.has(
              product.id
            )
        )
        .map(
          product =>
            product.id
        );

    this.loadingImageId = null;

    // Give browser time to render text first
    this.imageStartTimer =
      setTimeout(() => {

        this.loadNextImage();

      }, 350);
  }

  private loadNextImage(): void {

    // Previous image still loading
    if (this.loadingImageId) {
      return;
    }

    // Queue finished
    if (
      this.imageQueue.length === 0
    ) {
      return;
    }

    const nextId =
      this.imageQueue.shift();

    if (!nextId) {
      return;
    }

    this.loadingImageId = nextId;

    // This causes Angular to create
    // the img tag for ONLY this product
    this.imageAllowed.add(nextId);
  }

  // Called after image loads
  onImageFinished(
    productId: string
  ): void {

    // Prevent duplicate events
    if (
      this.loadingImageId !==
      productId
    ) {
      return;
    }

    this.loadingImageId = null;

    // Small gap before next image
    this.nextImageTimer =
      setTimeout(() => {

        this.loadNextImage();

      }, 100);
  }

  // Broken image
  onImageError(
    event: Event,
    productId: string
  ): void {

    const img =
      event.target as HTMLImageElement;

    // Hide broken image
    img.style.display = 'none';

    // Continue queue
    this.onImageFinished(
      productId
    );
  }

  buyNow(product: Product): void {

    const message =
      `Hi, I am interested in buying ${product.name} for $${product.price}`;

    const url =
      `https://wa.me/${this.phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(
      url,
      '_blank'
    );
  }
}