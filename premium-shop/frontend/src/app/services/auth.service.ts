import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>('/api/login', { email, password }).pipe(
      map(res => {
        if (res?.success && res?.token) {
          this.token = res.token;
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
