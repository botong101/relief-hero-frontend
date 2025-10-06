import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { DonationService } from '../../core/services/donation.service';

interface DonationHistory {
  id: number;
  donator: number;
  donator_name: string;
  donator_email: string;
  affected_first_name: string;
  affected_last_name: string;
  affected_phone: string;
  latitude: number;
  longitude: number;
  supply_needs_fulfilled: any;
  qr_code: string;
  donated_at: string;
  notes?: string;
}

@Component({
  selector: 'app-acknowledgements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acknowledgements.component.html',
  styleUrls: ['./acknowledgements.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcknowledgementsComponent implements OnInit, OnDestroy {
  recentDonations: DonationHistory[] = [];
  loading = true;
  error = '';
  private refreshSubscription?: Subscription;

  constructor(
    private donationService: DonationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRecentDonations();
    
    // Refresh every 10 seconds for real-time updates
    this.refreshSubscription = interval(10000).subscribe(() => {
      this.loadRecentDonations();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadRecentDonations(): void {
    this.loading = true;
    this.error = '';

    this.donationService.getDonationHistory().subscribe({
      next: (response: any) => {
        const donations = response.results || response;
        // Show only the most recent 10 donations
        this.recentDonations = donations.slice(0, 10);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Failed to load recent donations';
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Error loading donations:', err);
      }
    });
  }

  getSupplyNeedsSummary(supplyNeeds: any): string {
    if (!supplyNeeds || Object.keys(supplyNeeds).length === 0) {
      return 'general supplies';
    }
    
    const items: string[] = [];
    if (supplyNeeds.people_count) items.push(`${supplyNeeds.people_count} people`);
    if (supplyNeeds.water) items.push(`${supplyNeeds.water} water`);
    if (supplyNeeds.food) items.push(`${supplyNeeds.food} food`);
    if (supplyNeeds.medical_supplies) items.push(`${supplyNeeds.medical_supplies} medical supplies`);
    if (supplyNeeds.clothing) items.push(`${supplyNeeds.clothing} clothing`);
    if (supplyNeeds.shelter_materials) items.push(`${supplyNeeds.shelter_materials} shelter materials`);
    if (supplyNeeds.other) items.push(supplyNeeds.other);
    
    return items.length > 0 ? items.join(', ') : 'general supplies';
  }

  getTimeAgo(dateString: string): string {
    const now = new Date();
    const donationDate = new Date(dateString);
    const diffMs = now.getTime() - donationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }
}