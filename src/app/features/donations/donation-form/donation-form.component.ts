import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DonationService } from '../../../core/services/donation.service';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css']
})
export class DonationFormComponent implements OnInit {
  donationForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  useCurrentLocation = false;

  categories = [
    { value: 'food', label: 'Food' },
    { value: 'water', label: 'Water' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'shelter', label: 'Shelter Materials' },
    { value: 'hygiene', label: 'Hygiene Products' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private donationService: DonationService,
    private locationService: LocationService,
    private router: Router
  ) {
    this.donationForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required]],
      category: ['food', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['', [Validators.required]],
      pickup_location: ['', [Validators.required]],
      pickup_latitude: [null],
      pickup_longitude: [null],
      delivery_location: [''],
      delivery_latitude: [null],
      delivery_longitude: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.donationForm.valid) {
      this.loading = true;
      this.error = '';

      this.donationService.createDonation(this.donationForm.value).subscribe({
        next: (donation) => {
          this.success = 'Donation created successfully!';
          setTimeout(() => {
            this.router.navigate(['/donations', donation.id]);
          }, 1500);
        },
        error: (err) => {
          this.error = 'Failed to create donation. Please try again.';
          this.loading = false;
          console.error('Error:', err);
        }
      });
    }
  }

  async setCurrentLocation(): Promise<void> {
    try {
      const position = await this.locationService.getCurrentPosition();
      this.donationForm.patchValue({
        pickup_latitude: position.coords.latitude,
        pickup_longitude: position.coords.longitude
      });
      this.success = 'Current location set successfully!';
      setTimeout(() => this.success = '', 3000);
    } catch (error) {
      this.error = 'Unable to get your current location. Please ensure location permissions are enabled.';
      setTimeout(() => this.error = '', 5000);
    }
  }

  get title() { return this.donationForm.get('title'); }
  get description() { return this.donationForm.get('description'); }
  get category() { return this.donationForm.get('category'); }
  get quantity() { return this.donationForm.get('quantity'); }
  get unit() { return this.donationForm.get('unit'); }
  get pickup_location() { return this.donationForm.get('pickup_location'); }
}
