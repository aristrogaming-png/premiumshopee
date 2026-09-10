import { Component, DestroyRef, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ProductService } from "../../services/product.service";
import { AuthService } from "../../services/auth.service";
import { Product } from "../../models/product";
@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./admin-dashboard.component.html",
})
export class AdminDashboardComponent implements OnInit {
  products: Product[] = [];
  loading = false;
  deleting = "";
  error = "";
  constructor(
    private service: ProductService,
    private auth: AuthService,
    private router: Router,
    private destroyRef: DestroyRef,
  ) {}
  ngOnInit(): void {
    this.loadProducts();
  }
  loadProducts(): void {
    this.loading = true;
    this.error = "";
    this.service
      .getProducts(undefined, undefined, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.loading = false;
        },
        error: () => {
          this.error = "Unable to load inventory.";
          this.loading = false;
        },
      });
  }
  deleteProduct(id: string): void {
    if (
      this.deleting ||
      !confirm("Delete this product record? Its hosted image will be kept.")
    )
      return;
    this.deleting = id;
    this.error = "";
    this.service
      .deleteProduct(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting = "";
          this.loadProducts();
        },
        error: () => {
          this.deleting = "";
          this.error = "Unable to delete product. Please retry.";
        },
      });
  }
  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
