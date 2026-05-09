import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  private auth = inject(AuthService);

  @HostListener('document:click')
  @HostListener('document:keydown')
  @HostListener('document:mousemove')
  onActivity(): void { this.auth.refreshActivity(); }
}
