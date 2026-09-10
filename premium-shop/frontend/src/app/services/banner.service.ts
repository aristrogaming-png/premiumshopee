import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, shareReplay, tap, timeout } from "rxjs";
import { Banner } from "../models/banner";
import { environment } from "../../environment/environment";

@Injectable({ providedIn: "root" })
export class BannerService {
  private cached?: Observable<Banner[]>;
  private expires = 0;
  private readonly base = `${environment.apiBaseUrl}/api`;
  constructor(private http: HttpClient) {}

  getBanners(): Observable<Banner[]> {
    if (!this.cached || Date.now() >= this.expires) {
      this.expires = Infinity;
      const request = this.http.get<Banner[]>(`${this.base}/banners`).pipe(
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
