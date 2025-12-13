import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from 'src/environment/environment.prod';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private loginUrl = `${environment.apiBaseUrl}/api/login`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>(this.loginUrl, { email, password }).pipe(
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
    return !!this.token;
  }
}
