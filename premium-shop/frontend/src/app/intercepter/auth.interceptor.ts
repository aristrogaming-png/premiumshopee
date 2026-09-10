import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { environment } from 'src/environment/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Only attach token to your backend API calls
    const isApiCall =
      req.url.startsWith('/api/') ||
      (!!environment.apiBaseUrl && req.url.startsWith(`${environment.apiBaseUrl}/api/`));

    const isLoginCall =
      req.url === '/api/login' || req.url === `${environment.apiBaseUrl}/api/login`;

    const apiPath = environment.apiBaseUrl && req.url.startsWith(environment.apiBaseUrl)
      ? req.url.slice(environment.apiBaseUrl.length) : req.url;
    const isPublicProductRead = req.method === 'GET' && /^\/api\/(?:products(?:\/[^/?]+)?|banners)(?:\?.*)?$/.test(apiPath);

    const authReq =
      token && isApiCall && !isLoginCall && !isPublicProductRead
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          })
        : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // If token is invalid/expired, log out and redirect to login
        // But avoid redirect loops on login endpoint itself
        if (err.status === 401 && isApiCall && !isLoginCall) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
