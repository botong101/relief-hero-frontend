import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LocationService } from '../../../core/services/location.service';
import { QRCodeModule } from 'angularx-qrcode';
import { IconService } from '../../../services/icon.service';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';

@Component({
  selector: 'app-register-affected',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, QRCodeModule, SafeHtmlPipe],
  templateUrl: './register-affected.component.html',
  styleUrls: ['./register-affected.component.css']
})
export class RegisterAffectedComponent implements OnInit {
  shareLocationForm: FormGroup;
  loading = false;
  error = '';
  
  // Multi-step form tracking
  currentStep = 1;
  photoFile: File | null = null;
  photoPreview: string | null = null;
  
  // QR Code data (Step 4)
  qrCodeData: string = '';
  qrCodeSaved: boolean = false;
  registeredLocationData: any = null;
  
  // Restriction handling
  isRestricted = false;
  restrictionData: any = null;
  timeRemaining = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private locationService: LocationService,
    private iconService: IconService
  ) {
    // Initialize share location form with all fields
    this.shareLocationForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
      facebook: [''],
      email: ['', [Validators.email]],
      notes: [''],
      supply_needs: this.fb.group({
        people_count: ['', [Validators.required, Validators.min(1)]],
        water: [0, [Validators.min(0)]],
        food: [0, [Validators.min(0)]],
        medical_supplies: [0, [Validators.min(0)]],
        clothing: [0, [Validators.min(0)]],
        shelter_materials: [0, [Validators.min(0)]],
        other: ['']
      })
    });
  }

  ngOnInit(): void {
    // Component initialized
  }

  // Multi-step form navigation
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
    }
  }
  
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  
  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        // Step 1: Contact info validation
        const firstNameControl = this.shareLocationForm.get('first_name');
        const lastNameControl = this.shareLocationForm.get('last_name');
        const phoneControl = this.shareLocationForm.get('phone');
        return !!(firstNameControl?.valid && lastNameControl?.valid && phoneControl?.valid);
        
      case 2:
        // Step 2: Photo is required
        return this.photoFile !== null;
        
      case 3:
        // Step 3: People count is required
        const peopleControl = this.shareLocationForm.get('supply_needs.people_count');
        return peopleControl?.valid || false;
      
      case 4:
        // Step 4: QR code must be saved
        return this.qrCodeSaved;
        
      default:
        return false;
    }
  }

  // Photo handling methods
  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please capture an image.');
      return;
    }
    
    this.photoFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = null;
  }

  downloadQRCode(): void {
    const qrCanvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      const url = qrCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `donation-qr-${this.qrCodeData}.png`;
      link.href = url;
      link.click();
    }
  }

  proceedToMap(): void {
    if (!this.qrCodeSaved) {
      alert('Please confirm you have saved your QR code before proceeding.');
      return;
    }
    
    // Navigate to map
    this.router.navigate(['/map']);
  }

  async onSubmit(): Promise<void> {
    if (this.shareLocationForm.invalid || !this.photoFile) {
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // Get current location
      const position = await this.locationService.getCurrentPosition();
      
      // Prepare form data for multipart upload
      const formData = new FormData();
      
      // Add contact info
      formData.append('first_name', this.shareLocationForm.get('first_name')?.value);
      formData.append('last_name', this.shareLocationForm.get('last_name')?.value);
      formData.append('phone', this.shareLocationForm.get('phone')?.value);
      formData.append('facebook', this.shareLocationForm.get('facebook')?.value || '');
      formData.append('email', this.shareLocationForm.get('email')?.value || '');
      formData.append('notes', this.shareLocationForm.get('notes')?.value || '');
      
      // Add location data
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
      formData.append('accuracy', position.coords.accuracy.toString());
      
      // Add photo
      if (this.photoFile) {
        console.log('Photo file details:');
        console.log('  - Is File instance:', this.photoFile instanceof File);
        console.log('  - Name:', this.photoFile.name);
        console.log('  - Size:', this.photoFile.size, 'bytes');
        console.log('  - Type:', this.photoFile.type);
        console.log('  - Last modified:', this.photoFile.lastModified);
        formData.append('photo', this.photoFile, this.photoFile.name);
        console.log('Photo appended to FormData');
      } else {
        console.error('ERROR: No photo file!');
      }
      
      // Add supply needs
      const supplyNeeds = this.shareLocationForm.get('supply_needs')?.value;
      formData.append('supply_needs', JSON.stringify(supplyNeeds));
      
      // Generate session ID
      const sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      formData.append('session_id', sessionId);

      // Debug: Log all FormData entries
      console.log('FormData contents:');
      formData.forEach((value, key) => {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      // Share location anonymously (no user account creation)
      console.log('Sharing anonymous location...');
      const response = await this.locationService.shareAnonymousLocation(formData).toPromise();
      
      console.log('Location shared successfully!', response);

      // Save the QR code data
      this.qrCodeData = response.qr_code;
      this.registeredLocationData = response;

      // Save session info to localStorage
      localStorage.setItem('anonymous_session_id', sessionId);
      localStorage.setItem('anonymous_location_id', response.id);
      localStorage.setItem('location_sharing_enabled', 'true');
      localStorage.setItem('phone_number', this.shareLocationForm.get('phone')?.value);
      localStorage.setItem('qr_code', response.qr_code);

      // Create temporary user object for affected user role detection
      const affectedUser: any = {
        id: response.id,
        phone_number: this.shareLocationForm.get('phone')?.value,
        first_name: this.shareLocationForm.get('first_name')?.value,
        last_name: this.shareLocationForm.get('last_name')?.value,
        role: 'affected',
        is_anonymous: true,
        qr_code: response.qr_code
      };
      
      // Set the user in AuthService so it emits to subscribers
      this.authService.setCurrentUser(affectedUser);
      
      console.log('Affected user registered and stored:', affectedUser);

      // Move to Step 4 (QR Code Display)
      this.loading = false;
      this.currentStep = 4;

    } catch (error: any) {
      this.loading = false;
      console.error('Full error object:', error);
      console.error('Error status:', error?.status);
      console.error('Error message:', error?.error);
      
      // Handle 429 restriction error
      if (error?.status === 429 && error?.error?.restriction) {
        this.isRestricted = true;
        this.restrictionData = error.error.restriction;
        this.calculateTimeRemaining();
        this.error = error.error.error || 'You recently received a donation. Please wait before requesting help again.';
        return;
      }
      
      if (error?.error) {
        // If backend returns validation errors, show them
        if (typeof error.error === 'object' && !error.error.restriction) {
          const errorMessages = Object.entries(error.error)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          this.error = errorMessages || 'Unable to share location. Please try again.';
        } else {
          this.error = error.error.error || error.error || 'Unable to share location. Please try again.';
        }
      } else {
        this.error = 'Unable to share location. Please try again.';
      }
    }
  }

  calculateTimeRemaining(): void {
    if (!this.restrictionData) return;

    const now = new Date().getTime();
    const nextAllowed = new Date(this.restrictionData.next_allowed_at).getTime();
    const diff = nextAllowed - now;

    if (diff <= 0) {
      this.timeRemaining = 'Restriction expired. You can now request help.';
      this.isRestricted = false;
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.timeRemaining = `${hours} hour(s), ${minutes} minute(s), ${seconds} second(s)`;

    // Update every second
    setTimeout(() => this.calculateTimeRemaining(), 1000);
  }

  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }
}
