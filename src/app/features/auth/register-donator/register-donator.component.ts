import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AddressService, Province, City, Barangay } from '../../../core/services/address.service';
import { IconService } from '../../../services/icon.service';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

@Component({
  selector: 'app-register-donator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SafeHtmlPipe],
  templateUrl: './register-donator.component.html',
  styleUrls: ['./register-donator.component.css']
})
export class RegisterDonatorComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  error = '';
  
  // Address data
  provinces: Province[] = [];
  cities: City[] = [];
  barangays: Barangay[] = [];
  loadingProvinces = false;
  loadingCities = false;
  loadingBarangays = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private addressService: AddressService,
    private iconService: IconService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', [Validators.required]],
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      role: ['donator'], // Fixed as donator
      phone_number: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
      province: [''],
      city: [''],
      barangay: [''],
      address: [''],
      organization_name: [''],
      organization_type: ['individual'],
      donation_capacity: [''],
      preferred_donation_types: this.fb.group({
        food: [false],
        water: [false],
        medical: [false],
        clothing: [false],
        shelter: [false],
        cash: [false]
      })
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.loadProvinces();
    
    // Listen for province changes
    this.registerForm.get('province')?.valueChanges.subscribe((provinceCode) => {
      if (provinceCode) {
        this.loadCities(provinceCode);
        // Reset city and barangay when province changes
        this.registerForm.patchValue({ city: '', barangay: '' });
        this.cities = [];
        this.barangays = [];
      }
    });
    
    // Listen for city changes
    this.registerForm.get('city')?.valueChanges.subscribe((cityCode) => {
      if (cityCode) {
        this.loadBarangays(cityCode);
        // Reset barangay when city changes
        this.registerForm.patchValue({ barangay: '' });
        this.barangays = [];
      }
    });
  }

  loadProvinces(): void {
    this.loadingProvinces = true;
    this.addressService.getProvinces().subscribe({
      next: (provinces) => {
        this.provinces = provinces;
        this.loadingProvinces = false;
      },
      error: (err) => {
        console.error('Error loading provinces:', err);
        this.loadingProvinces = false;
      }
    });
  }

  loadCities(provinceCode: string): void {
    this.loadingCities = true;
    this.addressService.getCitiesByProvince(provinceCode).subscribe({
      next: (cities) => {
        this.cities = cities;
        this.loadingCities = false;
      },
      error: (err) => {
        console.error('Error loading cities:', err);
        this.loadingCities = false;
      }
    });
  }

  loadBarangays(cityCode: string): void {
    this.loadingBarangays = true;
    this.addressService.getBarangaysByCity(cityCode).subscribe({
      next: (barangays) => {
        this.barangays = barangays;
        this.loadingBarangays = false;
      },
      error: (err) => {
        console.error('Error loading barangays:', err);
        this.loadingBarangays = false;
      }
    });
  }

  getProvinceName(code: string): string {
    return this.provinces.find(p => p.code === code)?.name || '';
  }

  getCityName(code: string): string {
    return this.cities.find(c => c.code === code)?.name || '';
  }

  getBarangayName(code: string): string {
    return this.barangays.find(b => b.code === code)?.name || '';
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const password2 = form.get('password2');
    
    if (password && password2 && password.value !== password2.value) {
      password2.setErrors({ passwordMismatch: true });
    } else {
      if (password2?.hasError('passwordMismatch')) {
        password2.setErrors(null);
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.error = '';

      // Format the full address if all parts are provided
      let fullAddress = '';
      if (this.registerForm.value.province && this.registerForm.value.city && this.registerForm.value.barangay) {
        const barangayName = this.getBarangayName(this.registerForm.value.barangay);
        const cityName = this.getCityName(this.registerForm.value.city);
        const provinceName = this.getProvinceName(this.registerForm.value.province);
        fullAddress = this.addressService.formatAddress(barangayName, cityName, provinceName);
      }

      // Prepare registration data
      const registrationData = {
        ...this.registerForm.value,
        address: fullAddress || '', // Send formatted address to backend
        role: 'donator' // Ensure role is set
      };

      this.authService.register(registrationData).subscribe({
        next: () => {
          // Redirect to map after successful registration
          this.router.navigate(['/map']);
        },
        error: (err) => {
          this.error = err.error?.email?.[0] || err.error?.error || 'Registration failed. Please try again.';
          this.loading = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  // Getters for form validation
  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get password2() {
    return this.registerForm.get('password2');
  }

  get first_name() {
    return this.registerForm.get('first_name');
  }

  get last_name() {
    return this.registerForm.get('last_name');
  }

  get phone_number() {
    return this.registerForm.get('phone_number');
  }

  get organization_type() {
    return this.registerForm.get('organization_type');
  }

  get province() {
    return this.registerForm.get('province');
  }

  get city() {
    return this.registerForm.get('city');
  }

  get barangay() {
    return this.registerForm.get('barangay');
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }
}
