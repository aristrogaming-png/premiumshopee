import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';
import { ProductImageDirective } from '../../shared/product-image.directive';
import { ProductImagePipe, ProductImageSrcsetPipe } from '../../shared/product-image.pipe';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductImageDirective, ProductImagePipe, ProductImageSrcsetPipe],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  searchTerm = '';
  categories: string[] = [];
  selectedCategory = '';
  isLoading = true;
  errorMsg = '';
  readonly pageSize = 12;
  visibleCount = this.pageSize;
  private readonly phoneNumber = '918247276831';

  constructor(private productService: ProductService, private destroyRef: DestroyRef) {}

  ngOnInit(): void { this.fetchProducts(); }

  get hasMoreProducts(): boolean {
    return this.visibleCount < this.filteredProducts.length;
  }

  fetchProducts(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.productService.getProducts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.products = data;
        this.categories = Array.from(new Set(data.map(product => product.category).filter(Boolean)));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load products. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void { this.applyFilters(); }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = !search || (product.name ?? '').toLowerCase().includes(search)
        || (product.description ?? '').toLowerCase().includes(search);
      return matchesSearch && (!this.selectedCategory || product.category === this.selectedCategory);
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

  trackProduct(_index: number, product: Product): string { return product.id; }

  buyNow(product: Product): void {
    const message = 'Hi, I am interested in buying ' + product.name + ' for $' + product.price;
    window.open('https://wa.me/' + this.phoneNumber + '?text=' + encodeURIComponent(message), '_blank');
  }
}
