import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap, timeout } from 'rxjs';
import { Product } from '../models/product';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiBaseUrl}/api/products`;
  private catalog?: Observable<Product[]>;
  private catalogExpiresAt = 0;
  private readonly cacheDurationMs = 30_000;
  // Allow a sleeping host to wake up, but never leave the UI waiting forever.
  private readonly requestTimeoutMs = 90_000;

  constructor(private http: HttpClient) {}

  /**
   * Retrieve a list of products from the API.
   * Optional search and category are passed as query params.
   */
  getProducts(search?: string, category?: string): Observable<Product[]> {
    let params = new HttpParams();

    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);

    if (search || category) {
      return this.http.get<Product[]>(this.apiUrl, { params }).pipe(timeout(this.requestTimeoutMs));
    }

    if (!this.catalog || Date.now() >= this.catalogExpiresAt) {
      this.catalogExpiresAt = Infinity;
      const request = this.http.get<Product[]>(this.apiUrl).pipe(
        timeout(this.requestTimeoutMs),
        tap({
          next: () => {
            if (this.catalog === request) this.catalogExpiresAt = Date.now() + this.cacheDurationMs;
          },
          error: () => {
            if (this.catalog === request) this.invalidateCatalog();
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.catalog = request;
    }
    return this.catalog;
  }

  /** Fetch a single product by its ID. */
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(timeout(this.requestTimeoutMs));
  }

  /** Create a new product. */
  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product).pipe(tap(() => this.invalidateCatalog()));
  }

  /** Update an existing product. */
  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${product.id}`, product).pipe(tap(() => this.invalidateCatalog()));
  }

  /** Delete a product by ID. */
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.invalidateCatalog()));
  }

  private invalidateCatalog(): void {
    this.catalog = undefined;
    this.catalogExpiresAt = 0;
  }
}
