import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginPayload { username: string; password: string; timePin: string; }
interface LoginResponse { token: string; expiresIn: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'haj_token';
  private readonly EXPIRY_KEY = 'haj_expiry';
  private readonly SESSION_MINUTES = 30;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private loggedIn$ = new BehaviorSubject<boolean>(this.isAuthenticated());

  private http = inject(HttpClient);
  private router = inject(Router);

  get isLoggedIn$() { return this.loggedIn$.asObservable(); }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap(res => {
        sessionStorage.setItem(this.TOKEN_KEY, res.token);
        this.setExpiry();
        this.loggedIn$.next(true);
        this.startActivityTimer();
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.EXPIRY_KEY);
    this.loggedIn$.next(false);
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    const expiry = sessionStorage.getItem(this.EXPIRY_KEY);
    if (!token || !expiry) return false;
    if (Date.now() > parseInt(expiry, 10)) {
      this.clearSession();
      return false;
    }
    return true;
  }

  refreshActivity(): void {
    if (!this.isAuthenticated()) return;
    this.setExpiry();
    this.startActivityTimer();
  }

  private setExpiry(): void {
    const expiry = Date.now() + this.SESSION_MINUTES * 60 * 1000;
    sessionStorage.setItem(this.EXPIRY_KEY, String(expiry));
  }

  private startActivityTimer(): void {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.activityTimer = setTimeout(() => this.logout(), this.SESSION_MINUTES * 60 * 1000);
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.EXPIRY_KEY);
    this.loggedIn$.next(false);
  }
}
