import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form!: FormGroup;
  loading = false;
  error = '';
  currentMinute = '';
  showMinuteHint = false;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/pilgrims']);
      return;
    }
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      timePin: ['', [Validators.required, Validators.pattern(/^\d{1,2}$/)]],
    });
    this.updateMinuteHint();
    setInterval(() => this.updateMinuteHint(), 10000);
  }

  private updateMinuteHint(): void {
    const m = new Date().getMinutes();
    this.currentMinute = String(m).padStart(2, '0');
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const { username, password, timePin } = this.form.value;
    this.auth.login({ username, password, timePin: String(timePin).padStart(2, '0') }).subscribe({
      next: () => this.router.navigate(['/pilgrims']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'بيانات الدخول غير صحيحة';
      },
    });
  }

  toggleMinuteHint(): void { this.showMinuteHint = !this.showMinuteHint; }
}
