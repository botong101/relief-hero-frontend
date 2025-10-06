import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconService } from '../../../services/icon.service';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

interface DonationNotification {
  donation_history_id: number;
  donator_name: string;
  donator_email: string;
  supply_needs_fulfilled: any;
  qr_code: string;
  donated_at: string;
  session_id: string;
}

interface SupplyConfirmation {
  water_received: number;
  food_received: number;
  medical_supplies_received: number;
  clothing_received: number;
  shelter_materials_received: number;
  other_items: string;
  all_supplies_received: boolean;
}

@Component({
  selector: 'app-donation-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './donation-confirmation-modal.component.html',
  styleUrls: ['./donation-confirmation-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonationConfirmationModalComponent {
  @Input() show = false;
  @Input() donationData: DonationNotification | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitRating = new EventEmitter<{
    rating: number;
    comment: string;
    supplies_confirmed: SupplyConfirmation;
  }>();

  private router = inject(Router);
  private authService = inject(AuthService);
  private iconService = inject(IconService);
  private cdr = inject(ChangeDetectorRef);

  rating = 0;
  comment = '';
  suppliesConfirmed: SupplyConfirmation = {
    water_received: 0,
    food_received: 0,
    medical_supplies_received: 0,
    clothing_received: 0,
    shelter_materials_received: 0,
    other_items: '',
    all_supplies_received: false
  };

  ngOnInit() {
    this.applyDonationDefaults();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-apply defaults when donationData arrives or when modal is shown
    if ((changes['donationData'] && this.donationData) || (changes['show'] && this.show)) {
      this.applyDonationDefaults();
      // With OnPush, ensure the view is marked
      this.cdr.markForCheck();
    }
  }

  private applyDonationDefaults(): void {
    if (this.donationData?.supply_needs_fulfilled) {
      const supplies = this.donationData.supply_needs_fulfilled;
      this.suppliesConfirmed = {
        water_received: supplies.water || 0,
        food_received: supplies.food || 0,
        medical_supplies_received: supplies.medical_supplies || 0,
        clothing_received: supplies.clothing || 0,
        shelter_materials_received: supplies.shelter_materials || 0,
        other_items: supplies.other || '',
        all_supplies_received: true
      };
    }
  }

  setRating(stars: number): void {
    this.rating = stars;
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.rating === 0) {
      alert('Please provide a rating before submitting.');
      return;
    }

    this.submitRating.emit({
      rating: this.rating,
      comment: this.comment,
      supplies_confirmed: this.suppliesConfirmed
    });

    // After submitting rating, logout and redirect to register page
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/register']);
    }, 1000); // Small delay to allow the submission to complete
  }

  getSupplyExpected(supplyType: string): number {
    if (!this.donationData?.supply_needs_fulfilled) return 0;
    return this.donationData.supply_needs_fulfilled[supplyType] || 0;
  }

  getStarClass(starNumber: number): string {
    return starNumber <= this.rating ? 'star filled' : 'star';
  }

  fillExpectedSupplies(): void {
    if (this.donationData?.supply_needs_fulfilled) {
      const supplies = this.donationData.supply_needs_fulfilled;
      this.suppliesConfirmed = {
        water_received: supplies.water || 0,
        food_received: supplies.food || 0,
        medical_supplies_received: supplies.medical_supplies || 0,
        clothing_received: supplies.clothing || 0,
        shelter_materials_received: supplies.shelter_materials || 0,
        other_items: supplies.other || '',
        all_supplies_received: true
      };
    }
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' | undefined = 'md'): any {
    return this.iconService.getIcon(name, size);
  }
}