import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconService } from '../../../services/icon.service';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  currentUser: User | null = null;
  isSidebarOpen = false;

  constructor(
    public authService: AuthService,
    private iconService: IconService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleSidebar(): void {
    console.log('Toggle clicked - Before:', this.isSidebarOpen);
    this.isSidebarOpen = !this.isSidebarOpen;
    console.log('Toggle clicked - After:', this.isSidebarOpen);
    
    // Force change detection
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
    
    // Also add class to body to prevent scrolling when sidebar is open
    if (this.isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeSidebar(): void {
    console.log('Close called - Before:', this.isSidebarOpen);
    this.isSidebarOpen = false;
    console.log('Close called - After:', this.isSidebarOpen);
    
    // Remove body scroll lock
    document.body.style.overflow = '';
    
    // Force change detection
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.closeSidebar();
  }

  get isDonator(): boolean {
    return this.currentUser?.role === 'donator';
  }

  get isAffected(): boolean {
    return this.currentUser?.role === 'affected';
  }

  getUserFullName(): string {
    if (this.currentUser && this.isAffected) {
      return `${this.currentUser.first_name || ''} ${this.currentUser.last_name || ''}`.trim();
    }
    return this.currentUser?.email || '';
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }
}
