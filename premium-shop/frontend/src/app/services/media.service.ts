import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { timeout } from "rxjs";
import { UploadedImage } from "../models/banner";
import { environment } from "../../environment/environment";

@Injectable({ providedIn: "root" })
export class MediaService {
  constructor(private http: HttpClient) {}
  limits() {
    return this.http
      .get<{
        maxBytes: number;
      }>(`${environment.apiBaseUrl}/api/admin/uploads/config`)
      .pipe(timeout(15000));
  }
  upload(file: File, purpose: "product" | "banner") {
    const body = new FormData();
    body.append("purpose", purpose);
    body.append("image", file);
    return this.http
      .post<UploadedImage>(`${environment.apiBaseUrl}/api/uploads`, body, {
        observe: "events",
        reportProgress: true,
      })
      .pipe(timeout({ each: 90000 }));
  }
}
