import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DonationService } from '../../../core/services/donation.service';
import { AuthService } from '../../../core/services/auth.service';

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
  selector: 'app-donation-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './donation-list.component.html',
  styleUrls: ['./donation-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationListComponent implements OnInit {
  donations: DonationHistory[] = [];
  loading = true;
  error = '';
  
  isDonator = false;
  currentUserId: number | null = null;

  constructor(
    private donationService: DonationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    this.isDonator = user?.role === 'donator';
    this.currentUserId = user?.id || null;
    this.loadDonations();
  }

  loadDonations(): void {
    this.loading = true;
    this.error = '';
    
    console.log('Loading donation history...');
    console.log('API URL:', `${this.donationService['apiUrl']}/donation-history/`);

    this.donationService.getDonationHistory().subscribe({
      next: (response: any) => {
        console.log('Donation history response:', response);
        // Handle paginated response
        this.donations = response.results || response;
        this.loading = false;
        this.cdr.markForCheck();
        console.log('Loaded donations:', this.donations);
      },
      error: (err) => {
        this.error = 'Failed to load donation history';
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Error loading donation history:', err);
      }
    });
  }

  getSupplyNeedsSummary(supplyNeeds: any): string {
    if (!supplyNeeds || Object.keys(supplyNeeds).length === 0) {
      return 'No supplies recorded';
    }
    
    const items: string[] = [];
    if (supplyNeeds.people_count) items.push(`${supplyNeeds.people_count} people`);
    if (supplyNeeds.water) items.push(`${supplyNeeds.water} water`);
    if (supplyNeeds.food) items.push(`${supplyNeeds.food} food`);
    if (supplyNeeds.medical_supplies) items.push(`${supplyNeeds.medical_supplies} medical`);
    if (supplyNeeds.clothing) items.push(`${supplyNeeds.clothing} clothing`);
    if (supplyNeeds.shelter_materials) items.push(`${supplyNeeds.shelter_materials} shelter`);
    if (supplyNeeds.other) items.push(supplyNeeds.other);
    
    return items.length > 0 ? items.join(', ') : 'No supplies recorded';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isMyDonation(donation: DonationHistory): boolean {
    return this.currentUserId === donation.donator;
  }
  
  // TrackBy function for better *ngFor performance
  trackByDonationId(index: number, donation: DonationHistory): number {
    return donation.id;
  }
}
