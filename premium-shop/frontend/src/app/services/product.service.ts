import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product';
import { environment } from 'src/environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiBaseUrl}/api/products`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieve a list of products from the API.
   * Optional search and category are passed as query params.
   */
  getProducts(search?: string, category?: string): Observable<Product[]> {
    let params = new HttpParams();

    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);

    return this.http.get<Product[]>(this.apiUrl, { params });
  }

  /** Fetch a single product by its ID. */
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /** Create a new product. */
  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  /** Update an existing product. */
  updateProduct(product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${product.id}`, product);
  }

  /** Delete a product by ID. */
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
