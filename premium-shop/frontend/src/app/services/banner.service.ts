import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, forkJoin, map, of, shareReplay, tap, timeout } from "rxjs";
import { freshBootstrap } from '../shared/bootstrap-data';
import { Banner, withUsTravelBanner } from "../models/banner";
import { environment } from "../../environment/environment";

@Injectable({ providedIn: "root" })
export class BannerService {
  private cached?: Observable<Banner[]>;
  private expires = 0;
  private readonly base = `${environment.apiBaseUrl}/api`;
  constructor(private http: HttpClient) {
    const data = freshBootstrap();
    // Only the homepage renderer fetches banners. Other routes carry an empty
    // placeholder, which must not suppress the first real homepage request.
    if (data?.path === '/') { this.cached = of(data.banners); this.expires = Date.now() + 30000; }
  }

  getBanners(): Observable<Banner[]> {
    if (!this.cached || Date.now() >= this.expires) {
      this.expires = Infinity;
      const previewCountry = this.localPreviewCountry();
      const request = forkJoin({
        banners: this.http.get<Banner[]>(`${this.base}/banners`).pipe(timeout(90000)),
        visitor: previewCountry
          ? of({ countryCode: previewCountry })
          : this.http.get<{ countryCode?: string }>("/api/visitor-country").pipe(
              timeout(3000),
              catchError(() => of({ countryCode: undefined as string | undefined })),
            ),
      }).pipe(
        map(({ banners, visitor }) => withUsTravelBanner(banners, visitor.countryCode)),
        timeout(90000),
        tap({
          next: () => {
            if (this.cached === request) this.expires = Date.now() + 30000;
          },
          error: () => {
            if (this.cached === request) this.invalidate();
          },
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cached = request;
    }
    return this.cached;
  }
  private localPreviewCountry(): string | undefined {
    if (environment.production || typeof window === "undefined" ||
        !["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    const country = new URLSearchParams(window.location.search).get("previewCountry");
    return country && /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : undefined;
  }
  getAdminBanners(): Observable<Banner[]> {
    return this.http
      .get<Banner[]>(`${this.base}/admin/banners`)
      .pipe(timeout(90000));
  }
  save(banner: Banner): Observable<Banner> {
    const url = `${this.base}/admin/banners`;
    return (
      banner.id
        ? this.http.put<Banner>(`${url}/${banner.id}`, banner)
        : this.http.post<Banner>(url, banner)
    ).pipe(
      timeout(90000),
      tap(() => this.invalidate()),
    );
  }
  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/banners/${id}`).pipe(
      timeout(90000),
      tap(() => this.invalidate()),
    );
  }
  private invalidate(): void {
    this.cached = undefined;
    this.expires = 0;
  }
}
