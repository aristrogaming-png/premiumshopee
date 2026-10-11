import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { timeout } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private loginUrl = `${environment.apiBaseUrl}/api/login`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>(this.loginUrl, { email, password }).pipe(
      timeout(90000),
      map(res => {
        if (res?.success && res?.token) {
          this.token = res.token; // in-memory token
          return true;
        }
        return false;
      })
    );
  }

  logout() {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  isLoggedIn(): boolean {
    if (!this.token) return false;
    try {
      const claims = JSON.parse(atob(this.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (claims.role === 'admin' && typeof claims.exp === 'number' && claims.exp * 1000 > Date.now()) return true;
    } catch {}
    this.token = null;
    return false;
  }
}
