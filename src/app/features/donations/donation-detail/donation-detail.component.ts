import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DonationService } from '../../../core/services/donation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Donation, DonationTracking } from '../../../core/models/donation.model';

@Component({
  selector: 'app-donation-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './donation-detail.component.html',
  styleUrls: ['./donation-detail.component.css']
})
export class DonationDetailComponent implements OnInit {
  donation: Donation | null = null;
  trackingHistory: DonationTracking[] = [];
  loading = true;
  error = '';
  
  constructor(
    private route: ActivatedRoute,
    private donationService: DonationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDonation(+id);
      this.loadTrackingHistory(+id);
    }
  }

  loadDonation(id: number): void {
    this.loading = true;
    this.donationService.getDonation(id).subscribe({
      next: (donation) => {
        this.donation = donation;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load donation details';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  loadTrackingHistory(id: number): void {
    this.donationService.getDonationTracking(id).subscribe({
      next: (history) => {
        this.trackingHistory = history;
      },
      error: (err) => {
        console.error('Error loading tracking:', err);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    return `badge badge-${status}`;
  }

  get canEdit(): boolean {
    const user = this.authService.getCurrentUserValue();
    return user?.id === this.donation?.donator;
  }
}
