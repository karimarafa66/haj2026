import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  @ViewChild('hiddenOtp') hiddenOtp?: ElementRef<HTMLInputElement>;

  // Step 1 — credentials
  credForm!: FormGroup;
  // Step 2 — OTP value (single string of up to 6 digits)
  otpValue = '';
  hiddenFocused = false;

  step: 1 | 2 = 1;
  loading     = false;
  error       = '';
  maskedPhone = '';
  maskedEmail = '';
  resendCooldown = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) { this.router.navigate(['/pilgrims']); return; }
    this.credForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  // ── Step 1 submit ────────────────────────────────────────────────────────────
  onCredSubmit(): void {
    if (this.credForm.invalid) { this.credForm.markAllAsTouched(); return; }
    this.loading = true;
    this.error   = '';
    const { username, password } = this.credForm.value;
    this.auth.sendOtp({ username, password }).subscribe({
      next: (res) => {
        this.loading     = false;
        this.maskedPhone = res.maskedPhone ?? '';
        this.maskedEmail = res.maskedEmail ?? '';
        this.step        = 2;
        this.startCooldown(60);
        setTimeout(() => this.focusHidden(), 100);
      },
      error: (err) => {
        this.loading = false;
        this.error   = err?.error?.message || 'بيانات الدخول غير صحيحة';
      },
    });
  }

  // ── OTP input (single hidden input drives 6 visual boxes) ────────────────────
  onHiddenInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 6);
    this.otpValue = clean;
    input.value   = clean;
    if (clean.length === 6) this.onOtpSubmit();
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    this.otpValue = digits;
    if (this.hiddenOtp) this.hiddenOtp.nativeElement.value = digits;
    this.focusHidden();
    if (digits.length === 6) this.onOtpSubmit();
  }

  focusHidden(): void {
    const el = this.hiddenOtp?.nativeElement;
    if (!el) return;
    el.focus();
    // Place caret at end so next keystroke appends
    const len = el.value.length;
    try { el.setSelectionRange(len, len); } catch {}
  }

  get otpCode(): string { return this.otpValue; }

  // ── Step 2 submit ────────────────────────────────────────────────────────────
  onOtpSubmit(): void {
    if (this.otpCode.length !== 6) return;
    this.loading = true;
    this.error   = '';
    this.auth.verifyOtp({ otp: this.otpCode }).subscribe({
      next: () => this.router.navigate(['/pilgrims']),
      error: (err) => {
        this.loading    = false;
        this.error      = err?.error?.message || 'رمز التحقق غير صحيح';
        this.otpValue   = '';
        setTimeout(() => this.focusHidden(), 50);
      },
    });
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  resendOtp(): void {
    if (this.resendCooldown > 0) return;
    this.loading = true;
    this.error   = '';
    const { username, password } = this.credForm.value;
    this.auth.sendOtp({ username, password }).subscribe({
      next: () => {
        this.loading    = false;
        this.otpValue   = '';
        this.startCooldown(60);
        setTimeout(() => this.focusHidden(), 100);
      },
      error: (err) => {
        this.loading = false;
        this.error   = err?.error?.message || 'فشل إعادة الإرسال';
      },
    });
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  backToCredentials(): void {
    this.step       = 1;
    this.error      = '';
    this.otpValue   = '';
    if (this.cooldownTimer) { clearInterval(this.cooldownTimer); this.resendCooldown = 0; }
  }
}
