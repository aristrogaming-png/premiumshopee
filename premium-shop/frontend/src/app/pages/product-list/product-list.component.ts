import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  ProductService
} from '../../services/product.service';

import {
  Product
} from '../../models/product';


@Component({

  selector: 'app-product-list',

  templateUrl:
    './product-list.component.html',

  styleUrls: [
    './product-list.component.css'
  ]

})


export class ProductListComponent
  implements OnInit, OnDestroy {


  products: Product[] = [];

  filteredProducts: Product[] = [];


  searchTerm = '';

  categories: string[] = [];

  selectedCategory = '';


  isLoading = true;

  errorMsg = '';


  /*
   * Only render 12 cards initially.
   *
   * This prevents the browser from
   * creating every product together.
   */

  visibleCount = 12;

  readonly pageSize = 12;


  /*
   * Progressive image loading.
   *
   * Text/data appears first.
   * Images are released one-by-one.
   */

  imageAllowed =
    new Set<string>();


  private imageQueue:
    string[] = [];


  private loadingImageId:
    string | null = null;


  private imageStartTimer?:
    ReturnType<typeof setTimeout>;


  private nextImageTimer?:
    ReturnType<typeof setTimeout>;


  /*
   * WhatsApp number
   */

  private phoneNumber =
    '918247276831';


  constructor(
    private productService:
      ProductService
  ) {}


  ngOnInit(): void {

    this.fetchProducts();

  }


  ngOnDestroy(): void {

    this.clearImageTimers();

  }


  /*
   * Products currently visible
   */

  get displayedProducts():
    Product[] {

    return this.filteredProducts.slice(
      0,
      this.visibleCount
    );

  }


  /*
   * Show Load More only if needed
   */

  get hasMoreProducts():
    boolean {

    return (
      this.visibleCount <
      this.filteredProducts.length
    );

  }


  /*
   * FETCH PRODUCTS
   */

  fetchProducts(): void {

    this.isLoading = true;

    this.errorMsg = '';


    this.productService
      .getProducts()
      .subscribe({

        next: (data) => {

          this.products = data;


          /*
           * Generate categories
           */

          this.categories =
            Array.from(

              new Set(

                this.products

                  .map(
                    product =>
                      product.category
                  )

                  .filter(Boolean)

              )

            );


          /*
           * Filter immediately
           */

          this.applyFilters(false);


          /*
           * IMPORTANT:
           *
           * Hide main loading screen.
           * Text now appears immediately.
           */

          this.isLoading = false;


          /*
           * Images start after text
           */

          this.startProgressiveImageLoading();

        },


        error: () => {

          this.errorMsg =
            'Failed to load products. Please try again.';

          this.isLoading = false;

        }

      });

  }


  /*
   * SEARCH
   */

  onSearchChange(): void {

    this.applyFilters();

  }


  /*
   * CATEGORY FILTER
   */

  selectCategory(
    category: string
  ): void {

    this.selectedCategory =
      category;

    this.applyFilters();

  }


  /*
   * FILTER PRODUCTS
   */

  applyFilters(
    restartImages = true
  ): void {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    this.filteredProducts =

      this.products.filter(
        product => {


          const name =
            product.name
              ?.toLowerCase()
            ?? '';


          const description =
            product.description
              ?.toLowerCase()
            ?? '';


          const matchesSearch =

            !search ||

            name.includes(search) ||

            description.includes(
              search
            );


          const matchesCategory =

            !this.selectedCategory ||

            product.category ===
              this.selectedCategory;


          return (

            matchesSearch &&

            matchesCategory

          );

        }

      );


    /*
     * Searching/filtering returns
     * to first 12 products.
     */

    this.visibleCount =
      this.pageSize;


    if (
      restartImages &&
      !this.isLoading
    ) {

      this.startProgressiveImageLoading();

    }

  }


  /*
   * LOAD NEXT 12
   */

  loadMore(): void {

    this.visibleCount +=
      this.pageSize;


    this.startProgressiveImageLoading();

  }


  /*
   * Used by HTML:
   *
   * Should Angular create the
   * <img> element yet?
   */

  isImageAllowed(
    productId: string
  ): boolean {

    return this.imageAllowed.has(
      productId
    );

  }


  /*
   * Build image queue
   */

  private
  startProgressiveImageLoading():
    void {

    this.clearImageTimers();


    /*
     * Reset active pointer.
     */

    this.loadingImageId =
      null;


    /*
     * Only images from products
     * currently visible are queued.
     */

    this.imageQueue =

      this.displayedProducts

        .filter(
          product =>
            Boolean(
              product.imageUrl
            )
        )

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


    /*
     * Give browser 350ms
     * to render text first.
     */

    this.imageStartTimer =

      setTimeout(
        () => {

          this.loadNextImage();

        },
        350
      );

  }


  /*
   * Allow ONE image
   */

  private loadNextImage():
    void {

    if (
      this.loadingImageId ||
      this.imageQueue.length === 0
    ) {

      return;

    }


    const nextId =
      this.imageQueue.shift();


    if (!nextId) {

      return;

    }


    this.loadingImageId =
      nextId;


    /*
     * This causes Angular
     * to create the <img>.
     */

    this.imageAllowed.add(
      nextId
    );

  }


  /*
   * Called when image finishes
   */

  onImageFinished(
    productId: string
  ): void {

    if (
      this.loadingImageId !==
      productId
    ) {

      return;

    }


    this.loadingImageId =
      null;


    /*
     * Small gap before next image.
     */

    this.nextImageTimer =

      setTimeout(
        () => {

          this.loadNextImage();

        },
        100
      );

  }


  /*
   * Broken image
   */

  onImageError(
    event: Event,
    productId: string
  ): void {

    const img = event.target as HTMLImageElement;

    img.style.display = 'none';

    /*
     * Continue queue.
     */

    this.onImageFinished(
      productId
    );

  }


  /*
   * Clear timers
   */

  private clearImageTimers():
    void {

    if (
      this.imageStartTimer
    ) {

      clearTimeout(
        this.imageStartTimer
      );

      this.imageStartTimer =
        undefined;

    }


    if (
      this.nextImageTimer
    ) {

      clearTimeout(
        this.nextImageTimer
      );

      this.nextImageTimer =
        undefined;

    }

  }


  /*
   * WHATSAPP BUY
   */

  buyNow(
    product: Product
  ): void {

    const message =

      `Hi, I am interested in buying ${product.name} for $${product.price}`;


    const url =

      `https://wa.me/${this.phoneNumber}?text=${encodeURIComponent(
        message
      )}`;


    window.open(
      url,
      '_blank'
    );

  }

}