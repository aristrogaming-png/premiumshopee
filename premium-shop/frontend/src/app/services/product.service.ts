import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  /**
   * Base URL for the product API. In development the Angular dev server
   * proxies requests beginning with `/api` to the backend running on
   * localhost:3000 via proxy.conf.json. In production you can adjust
   * this value accordingly.
   */
  private apiUrl = '/api/products';

  constructor(private http: HttpClient) {}

  /**
   * Retrieve a list of products from the API. Optional search and
   * category parameters are passed as query parameters to the backend.
   */
  getProducts(
    search?: string,
    category?: string
  ): Observable<Product[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    if (category) {
      params = params.set('category', category);
    }
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
  deleteProduct(id: string): Observable<Product> {
    return this.http.delete<Product>(`${this.apiUrl}/${id}`);
  }
}