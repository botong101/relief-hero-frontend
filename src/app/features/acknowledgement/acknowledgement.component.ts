import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationService } from '../../core/services/donation.service';
import { AuthService } from '../../core/services/auth.service';
import { IconService } from '../../services/icon.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { interval, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';

interface DonatorAcknowledgment {
  donation_id: number;
  affected_user: string;
  location: {
    latitude: number;
    longitude: number;
  };
  donated_at: string;
  supplies_donated: any;
  supplies_received: {
    water: number;
    food: number;
    medical_supplies: number;
    clothing: number;
    shelter_materials: number;
    other_items: string;
    all_supplies_received: boolean;
  };
  user_feedback: {
    rating: number | null;
    comment: string;
    rated_at: string | null;
  };
  has_confirmation: boolean;
}

interface Contributor {
  rank: number;
  donator_id: number;
  donator_name: string;
  donator_email: string;
  total_donations: number;
  total_people_helped: number;
  supplies_contributed: {
    water: number;
    food: number;
    medical_supplies: number;
    clothing: number;
    shelter_materials: number;
  };
}

@Component({
  selector: 'app-acknowledgement',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './acknowledgement.component.html',
  styleUrls: ['./acknowledgement.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcknowledgementComponent implements OnInit, OnDestroy {
  acknowledgments: DonatorAcknowledgment[] = [];
  contributors: Contributor[] = [];
  loading = true;
  rankingLoading = true;
  error = '';
  rankingError = '';
  private refreshSubscription?: Subscription;

  private iconService = inject(IconService);

  constructor(
    private donationService: DonationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAcknowledgments();
    this.loadContributorsRanking();
    
    // Auto-refresh every 30 seconds for real-time updates
    this.refreshSubscription = interval(30000)
      .pipe(startWith(0))
      .subscribe(() => {
        this.loadAcknowledgments();
        this.loadContributorsRanking();
      });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadAcknowledgments(): void {
    // Check if user is authenticated and is a donator
    const currentUser = this.authService.getCurrentUserValue();
    
    if (currentUser && currentUser.role === 'donator') {
      // Load personalized acknowledgments for authenticated donators
      this.donationService.getDonatorAcknowledgments().subscribe({
        next: (response: any) => {
          this.acknowledgments = response.acknowledgments.sort((a: DonatorAcknowledgment, b: DonatorAcknowledgment) => 
            new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime()
          );
          this.loading = false;
          this.error = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading donator acknowledgments:', err);
          // Fallback to public donation history
          this.loadPublicDonationHistory();
        }
      });
    } else {
      // Load public donation history for non-authenticated users or affected users
      this.loadPublicDonationHistory();
    }
  }

  private loadPublicDonationHistory(): void {
    this.donationService.getDonationHistory().subscribe({
      next: (response: any) => {
        // Convert public donation history to acknowledgment format
        const donations = response.results || response;
        this.acknowledgments = donations.map((donation: any) => ({
          donation_id: donation.id,
          affected_user: `${donation.affected_first_name} ${donation.affected_last_name}`,
          location: {
            latitude: donation.latitude,
            longitude: donation.longitude
          },
          donated_at: donation.donated_at,
          supplies_donated: donation.supply_needs_fulfilled,
          supplies_received: {
            water: 0,
            food: 0,
            medical_supplies: 0,
            clothing: 0,
            shelter_materials: 0,
            other_items: '',
            all_supplies_received: false
          },
          user_feedback: {
            rating: null,
            comment: '',
            rated_at: null
          },
          has_confirmation: false
        })).sort((a: DonatorAcknowledgment, b: DonatorAcknowledgment) => 
          new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime()
        );
        this.loading = false;
        this.error = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Failed to load donation announcements';
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Error loading public donation history:', err);
      }
    });
  }

  loadContributorsRanking(): void {
    this.donationService.getContributorsRanking().subscribe({
      next: (contributors: Contributor[]) => {
        this.contributors = contributors;
        this.rankingLoading = false;
        this.rankingError = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.rankingError = 'Failed to load contributors ranking';
        this.rankingLoading = false;
        this.cdr.markForCheck();
        console.error('Error loading contributors ranking:', err);
      }
    });
  }

  getSupplyDetails(supplyNeeds: any): string {
    if (!supplyNeeds || Object.keys(supplyNeeds).length === 0) {
      return 'relief supplies';
    }
    
    const details: string[] = [];
    if (supplyNeeds.people_count) details.push(`${supplyNeeds.people_count} people`);
    if (supplyNeeds.water) details.push(`${supplyNeeds.water} water supplies`);
    if (supplyNeeds.food) details.push(`${supplyNeeds.food} food packages`);
    if (supplyNeeds.medical_supplies) details.push(`${supplyNeeds.medical_supplies} medical supplies`);
    if (supplyNeeds.clothing) details.push(`${supplyNeeds.clothing} clothing items`);
    if (supplyNeeds.shelter_materials) details.push(`${supplyNeeds.shelter_materials} shelter materials`);
    if (supplyNeeds.other) details.push(supplyNeeds.other);
    
    return details.length > 0 ? details.join(', ') : 'relief supplies';
  }

  hasAnySupplies(supplies: any): boolean {
    if (!supplies) return false;
    return supplies.water > 0 || supplies.food > 0 || supplies.medical_supplies > 0 || 
           supplies.clothing > 0 || supplies.shelter_materials > 0;
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }

  trackByDonationId(index: number, acknowledgment: DonatorAcknowledgment): number {
    return acknowledgment.donation_id;
  }

  trackByContributorId(index: number, contributor: Contributor): number {
    return contributor.donator_id;
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }

  getRankMedal(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  }

  getTotalSuppliesContributed(supplies: any): number {
    if (!supplies) return 0;
    return (supplies.water || 0) + 
           (supplies.food || 0) + 
           (supplies.medical_supplies || 0) + 
           (supplies.clothing || 0) + 
           (supplies.shelter_materials || 0);
  }

  getSuppliesBreakdown(supplies: any): string {
    if (!supplies) return 'No supplies recorded';
    const items: string[] = [];
    if (supplies.water) items.push(`${supplies.water} water`);
    if (supplies.food) items.push(`${supplies.food} food`);
    if (supplies.medical_supplies) items.push(`${supplies.medical_supplies} medical`);
    if (supplies.clothing) items.push(`${supplies.clothing} clothing`);
    if (supplies.shelter_materials) items.push(`${supplies.shelter_materials} shelter`);
    return items.join(', ') || 'No supplies recorded';
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' | undefined = 'md'): any {
    return this.iconService.getIcon(name, size);
  }
}