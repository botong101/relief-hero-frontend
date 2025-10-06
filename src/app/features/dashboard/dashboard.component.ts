import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DonationService } from '../../core/services/donation.service';
import { User } from '../../core/models/user.model';
import { Donation } from '../../core/models/donation.model';
import { IconService } from '../../services/icon.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  recentDonations: Donation[] = [];
  loading = true;
  
  // Stats
  totalDonations = 0;
  pendingDonations = 0;
  inTransitDonations = 0;
  deliveredDonations = 0;

  constructor(
    private authService: AuthService,
    private donationService: DonationService,
    private iconService: IconService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load user's donations
    this.donationService.getDonations({ my_donations: true }).subscribe({
      next: (response: any) => {
        // Backend returns paginated response with 'results' array
        const donations = Array.isArray(response) ? response : (response.results || []);
        this.recentDonations = donations.slice(0, 5); // Show latest 5
        this.calculateStats(donations);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading donations:', err);
        this.loading = false;
      }
    });
  }

  calculateStats(donations: Donation[]): void {
    this.totalDonations = donations.length;
    this.pendingDonations = donations.filter(d => d.status === 'pending').length;
    this.inTransitDonations = donations.filter(d => d.status === 'in_transit').length;
    this.deliveredDonations = donations.filter(d => d.status === 'delivered').length;
  }

  get isDonator(): boolean {
    return this.currentUser?.role === 'donator';
  }

  get isAffected(): boolean {
    return this.currentUser?.role === 'affected';
  }

  getStatusBadgeClass(status: string): string {
    return `badge badge-${status}`;
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }
}
