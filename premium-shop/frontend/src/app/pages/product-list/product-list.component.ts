import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  categories: string[] = [];
  selectedCategory = '';
  isLoading = true;
   errorMsg = '';


  // WhatsApp contact number (international format without plus sign)
  private phoneNumber = '918247276831';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.fetchProducts();
  }
  
  fetchProducts(): void {
    this.isLoading = true;
    this.errorMsg = '';
  
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.categories = Array.from(new Set(this.products.map(p => p.category)));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load products. Please try again.';
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

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search);
      const matchesCategory =
        !this.selectedCategory || product.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  /**
   * Launch WhatsApp with a prefilled message when the user clicks
   * "Buy Now". If the product is out of stock the button is disabled
   * so this method will only be triggered for available products.
   */
  buyNow(product: Product): void {
    const message = `Hi, I am interested in buying ${product.name} for $${product.price}`;
    const url = `https://wa.me/${this.phoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, '_blank');
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/placeholder.jpg';
  }
  
}