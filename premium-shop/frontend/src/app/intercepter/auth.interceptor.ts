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
import { environment } from 'src/environment/environment.prod';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Only attach token to your backend API calls
    const isApiCall =
      req.url.startsWith('/api') ||
      req.url.startsWith(environment.apiBaseUrl);

    const isLoginCall =
      req.url.includes('/api/login') ||
      req.url.includes(`${environment.apiBaseUrl}/api/login`);

    const authReq =
      token && isApiCall && !isLoginCall
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
        if (err.status === 401 && !isLoginCall) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
