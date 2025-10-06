import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import * as L from 'leaflet';
import { LocationService } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { Location } from '../../core/models/location.model';
import { Subscription, interval } from 'rxjs';
import { QRCodeModule } from 'angularx-qrcode';
import { QrScannerComponent } from '../../shared/components/qr-scanner/qr-scanner.component';
import { DonationConfirmationModalComponent } from '../../shared/components/donation-confirmation-modal/donation-confirmation-modal.component';
import { DonationService } from '../../core/services/donation.service';
import { LocationTrackingService, TrackingStatus } from '../../services/location-tracking.service';
import { IconService } from '../../services/icon.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { environment } from '../../../environments/environment';

// Anonymous Location Interface
interface AnonymousLocation {
  id: number;
  phone: string;
  facebook?: string;
  email?: string;
  notes?: string;
  photo?: string;
  supply_needs: {
    people_count?: number;
    water?: number;
    food?: number;
    medical_supplies?: number;
    clothing?: number;
    shelter_materials?: number;
    other?: string;
  };
  latitude: number;
  longitude: number;
  accuracy?: number;
  created_at: string;
  updated_at: string;
  last_seen: string;
  is_active: boolean;
  session_id: string;
  qr_code?: string;
  first_name?: string;
  last_name?: string;
  donation_received?: boolean;
  donators_on_the_way?: Array<{
    id: number;
    donator_name: string;
    marked_at: string;
    arrived: boolean;
  }>;
}

interface DonationNotification {
  session_id: string;
  donation_history_id: number;
  donator_name: string;
  donator_email: string;
  supply_needs_fulfilled: any;
  qr_code: string;
  donated_at: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QRCodeModule, QrScannerComponent, DonationConfirmationModalComponent, SafeHtmlPipe],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  private map!: L.Map;
  private markers: L.Marker[] = [];
  private currentUserMarker?: L.Marker;
  locations: AnonymousLocation[] = [];
  selectedLocation: AnonymousLocation | null = null;
  isAffectedUser = false;
  isLocationSharing = false;
  private watchId?: number;
  private locationSubscription?: Subscription;
  private updateIntervalSubscription?: Subscription;
  offlineQueue: any[] = [];
  loading = true;
  error = '';
  isOnline = navigator.onLine;
  lastPosition?: GeolocationPosition;
  
  // Share Location Modal
  showShareModal = false;
  shareLocationForm: FormGroup;
  submitting = false;
  sharedUserData: any = null; // Store user data after sharing
  
  currentStep = 1; // Multi-step form tracking (1-3)
  photoFile: File | null = null;
  photoPreview: string | null = null;
  
  // QR Code Modal
  showQRModal = false;
  userQRCode: string = '';
  
  // Mark as On The Way Modal
  showOnTheWayModal = false;
  selectedLocationForDonation: AnonymousLocation | null = null;
  
  // QR Scanner Modal
  showScannerModal = false;
  
  // Donation Confirmation Modal (for affected users)
  showDonationConfirmationModal = false;
  donationNotificationData: DonationNotification | null = null;
  
  // WebSocket connection
  private webSocket?: WebSocket;
  private currentSessionId?: string;

  // Location Tracking
  public trackingStatus: TrackingStatus = { isTracking: false };
  private trackingSubscription?: Subscription;

  // Default Barangay Locations for Bogo City (Barangay Hall coordinates)
  private defaultBarangayMarkers: L.Marker[] = [];
  private barangayLocations = [
    // Bogo City Barangays - Barangay Hall Locations
    { name: 'Anonang Norte Barangay Hall', lat: 11.0507, lng: 124.0047, city: 'Bogo City', address: 'Anonang Norte, Bogo City' },
    { name: 'Anonang Sur Barangay Hall', lat: 11.0474, lng: 124.0041, city: 'Bogo City', address: 'Anonang Sur, Bogo City' },
    { name: 'Banban Barangay Hall', lat: 11.0635, lng: 124.0092, city: 'Bogo City', address: 'Banban, Bogo City' },
    { name: 'Binabag Barangay Hall', lat: 11.0551, lng: 124.0069, city: 'Bogo City', address: 'Binabag, Bogo City' },
    { name: 'Bungtod Barangay Hall', lat: 11.0441, lng: 124.0125, city: 'Bogo City', address: 'Bungtod, Bogo City' },
    { name: 'Carbon Barangay Hall', lat: 11.0584, lng: 124.0036, city: 'Bogo City', address: 'Carbon, Bogo City' },
    { name: 'Cayang Barangay Hall', lat: 11.0407, lng: 124.0158, city: 'Bogo City', address: 'Cayang, Bogo City' },
    { name: 'Cogon Barangay Hall', lat: 11.0518, lng: 124.0080, city: 'Bogo City', address: 'Cogon, Bogo City' },
    { name: 'Dakit Barangay Hall', lat: 11.0462, lng: 124.0147, city: 'Bogo City', address: 'Dakit, Bogo City' },
    { name: 'Don Pedro Rodriguez Barangay Hall', lat: 11.0529, lng: 124.0025, city: 'Bogo City', address: 'Don Pedro Rodriguez, Bogo City' },
    { name: 'Gairan Barangay Hall', lat: 11.0495, lng: 124.0100, city: 'Bogo City', address: 'Gairan, Bogo City' },
    { name: 'Guadalupe Barangay Hall', lat: 11.0451, lng: 124.0136, city: 'Bogo City', address: 'Guadalupe, Bogo City' },
    { name: 'La Paz Barangay Hall', lat: 11.0540, lng: 124.0014, city: 'Bogo City', address: 'La Paz, Bogo City' },
    { name: 'Libertad Barangay Hall', lat: 11.0484, lng: 124.0089, city: 'Bogo City', address: 'Libertad, Bogo City' },
    { name: 'Lourdes Barangay Hall', lat: 11.0507, lng: 124.0058, city: 'Bogo City', address: 'Lourdes, Bogo City' },
    { name: 'Malingin Barangay Hall', lat: 11.0418, lng: 124.0169, city: 'Bogo City', address: 'Malingin, Bogo City' },
    { name: 'Marangog Barangay Hall', lat: 11.0562, lng: 124.0003, city: 'Bogo City', address: 'Marangog, Bogo City' },
    { name: 'Nailon Barangay Hall', lat: 11.0473, lng: 124.0114, city: 'Bogo City', address: 'Nailon, Bogo City' },
    { name: 'Odlot Barangay Hall', lat: 11.0429, lng: 124.0180, city: 'Bogo City', address: 'Odlot, Bogo City' },
    { name: 'Pandan Barangay Hall', lat: 11.0551, lng: 124.0047, city: 'Bogo City', address: 'Pandan, Bogo City' },
    { name: 'Polambato Barangay Hall', lat: 11.0415, lng: 124.0191, city: 'Bogo City', address: 'Polambato, Bogo City' },
    { name: 'Sambag Barangay Hall', lat: 11.0495, lng: 124.0069, city: 'Bogo City', address: 'Sambag, Bogo City' },
    { name: 'San Vicente Barangay Hall', lat: 11.0462, lng: 124.0125, city: 'Bogo City', address: 'San Vicente, Bogo City' },
    { name: 'Santo Niño Barangay Hall', lat: 11.0529, lng: 124.0036, city: 'Bogo City', address: 'Santo Niño, Bogo City' },
    { name: 'Santo Rosario Barangay Hall', lat: 11.0440, lng: 124.0147, city: 'Bogo City', address: 'Santo Rosario, Bogo City' },
    { name: 'Siocon Barangay Hall', lat: 11.0406, lng: 124.0200, city: 'Bogo City', address: 'Siocon, Bogo City' },
    { name: 'Sudlonon Barangay Hall', lat: 11.0484, lng: 124.0091, city: 'Bogo City', address: 'Sudlonon, Bogo City' },
    { name: 'Taytayan Barangay Hall', lat: 11.0518, lng: 124.0080, city: 'Bogo City', address: 'Taytayan, Bogo City' }
  ];

  constructor(
    private locationService: LocationService,
    private donationService: DonationService,
    private authService: AuthService,
    private locationTrackingService: LocationTrackingService,
    private iconService: IconService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initialize share location form with PH phone number validation and supply needs
    this.shareLocationForm = this.fb.group({
      phone: ['', [
        Validators.required,
        Validators.pattern(/^(09|\+639)\d{9}$/) // PH mobile number format
      ]],
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
    // Subscribe to user changes from AuthService
    this.authService.currentUser$.subscribe(user => {
      this.isAffectedUser = user?.role === 'affected';
      console.log('User updated - isAffectedUser:', this.isAffectedUser, 'user:', user);
    });
    
    // Also check localStorage directly on init in case of timing issues
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) {
      try {
        const parsedUser = JSON.parse(userFromStorage);
        this.isAffectedUser = parsedUser.role === 'affected';
        console.log('Map component initialized from localStorage - isAffectedUser:', this.isAffectedUser);
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
      }
    }
    
    // Subscribe to location tracking status updates
    this.trackingSubscription = this.locationTrackingService.trackingStatus$.subscribe(
      status => {
        this.trackingStatus = status;
        this.cdr.detectChanges();
        console.log('Tracking status updated:', status);
      }
    );
    
    // Check if user is currently sharing (has active anonymous location session)
    const sessionId = localStorage.getItem('anonymous_session_id');
    const locationId = localStorage.getItem('anonymous_location_id');
    const sharingEnabled = localStorage.getItem('location_sharing_enabled');
    this.isLocationSharing = !!(sessionId && locationId && sharingEnabled === 'true');
    
    console.log('Location sharing status:', this.isLocationSharing, 'sessionId:', sessionId, 'locationId:', locationId);
    
    // Store current session ID and initialize WebSocket for the session owner (anonymous or logged-in)
    // Anonymous affected users share a session_id in localStorage when they create a location.
    // Previously we only initialized the WebSocket for authenticated users with role 'affected'.
    // That prevented anonymous affected users from receiving qr_scan_notification messages.
    if (sessionId) {
      this.currentSessionId = sessionId;
      this.initializeWebSocket();

      // Request notification permission for donation alerts (best-effort)
      if (Notification && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        }).catch(err => console.warn('Notification permission request failed', err));
      }
    }
    
    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('location_offline_queue');
    if (savedQueue) {
      this.offlineQueue = JSON.parse(savedQueue);
    }

    // Check if we should auto-open share location modal (after registration)
    this.route.queryParams.subscribe(params => {
      if (params['openShareModal'] === 'true' && this.isAffectedUser && !this.isLocationSharing) {
        // Delay to ensure map is initialized
        setTimeout(() => {
          this.openShareLocationModal();
        }, 500);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadLocations();
    
    // Disabled auto-refresh - locations only update on manual refresh or specific events
    // this.updateIntervalSubscription = interval(5000).subscribe(() => {
    //   this.loadLocations();
    // });
    
    // Removed auto-start of location sharing - users must click "Share My Location" button
  }

  ngOnDestroy(): void {
    // Close WebSocket connection
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = undefined;
    }
    this.currentSessionId = undefined;
    
    // Clean up existing subscriptions and watchers
    if (this.watchId) {
      this.locationService.clearWatch(this.watchId);
    }
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.updateIntervalSubscription) {
      this.updateIntervalSubscription.unsubscribe();
    }
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
    
    // Stop location tracking if active
    if (this.locationTrackingService.isCurrentlyTracking()) {
      this.locationTrackingService.stopTracking();
    }
    
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }

  private initMap(): void {
    // Center map on Bogo City
    this.map = L.map('map').setView([11.0500, 124.0050], 13); // Bogo City center with higher zoom

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Fix marker icon issue with Leaflet in Angular
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  loadLocations(): void {
    this.loading = true;
    this.locationService.getActiveAnonymousLocations().subscribe({
      next: (locations: AnonymousLocation[]) => {
        this.locations = locations;
        this.updateMapMarkers(locations);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load locations';
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading locations:', err);
      }
    });
  }

  private updateMapMarkers(locations: AnonymousLocation[]): void {
    // Clear existing markers (except current user marker and barangay markers)
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Add default barangay markers first
    this.addDefaultBarangayMarkers();

    // Add new markers for affected users
    locations.forEach(location => {
      // Red marker for affected users
      const marker = L.marker([location.latitude, location.longitude], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      })
        .addTo(this.map)
        .on('click', () => {
          this.openLocationCard(location);
        });
      
      this.markers.push(marker);
    });

    // Don't auto-fit bounds - let users control their view
    // If users want to see all markers, they can zoom out manually
    // if (locations.length > 0) {
    //   const group = L.featureGroup(this.markers);
    //   this.map.fitBounds(group.getBounds().pad(0.1));
    // }
  }

  private addDefaultBarangayMarkers(): void {
    // Clear existing barangay markers
    this.defaultBarangayMarkers.forEach(marker => marker.remove());
    this.defaultBarangayMarkers = [];

    // Add barangay hall markers for Bogo City
    this.barangayLocations.forEach(barangay => {
      // Government building icon (green marker) for barangay halls
      const marker = L.marker([barangay.lat, barangay.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      })
        .addTo(this.map)
        .bindPopup(`
          <div class="barangay-popup">
            <h4 style="margin: 0 0 8px 0; color: #059669; font-size: 14px;">
              🏛️ ${barangay.name}
            </h4>
            <p style="margin: 0; color: #666; font-size: 12px;">
              <strong>Address:</strong> ${(barangay as any).address}<br>
              <strong>City:</strong> ${barangay.city}<br>
              <strong>Province:</strong> Cebu<br>
              <strong>Type:</strong> Government Building<br>
              <strong>Coordinates:</strong> ${barangay.lat.toFixed(4)}, ${barangay.lng.toFixed(4)}
            </p>
            <div style="margin-top: 8px; padding: 6px; background: #f0fdf4; border-radius: 4px; border-left: 3px solid #059669;">
              <small style="color: #065f46; font-weight: 500;">
                📋 Local Government Office for administrative services
              </small>
            </div>
          </div>
        `);
      
      this.defaultBarangayMarkers.push(marker);
    });
  }

  // Location Card Methods
  openLocationCard(location: AnonymousLocation): void {
    this.selectedLocation = location;
    this.cdr.detectChanges();
  }

  closeLocationCard(): void {
    this.selectedLocation = null;
    this.cdr.detectChanges();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  copyCoordinates(location: AnonymousLocation): void {
    const coords = `${location.latitude}, ${location.longitude}`;
    navigator.clipboard.writeText(coords).then(() => {
      alert('Coordinates copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy coordinates:', err);
    });
  }

  openInMaps(location: AnonymousLocation): void {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  }

  openGoogleMapsDirections(location: AnonymousLocation | null): void {
    if (!location) {
      alert('Location not available for directions');
      return;
    }

    // Get current user's location for directions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          const destinationLat = location.latitude;
          const destinationLng = location.longitude;
          
          // Create Google Maps directions URL
          const directionsUrl = `https://www.google.com/maps/dir/${currentLat},${currentLng}/${destinationLat},${destinationLng}`;
          
          // Open in new tab
          window.open(directionsUrl, '_blank');
        },
        (error) => {
          console.error('Error getting current location for directions:', error);
          
          // Fallback: Open destination only
          const fallbackUrl = `https://www.google.com/maps/dir//${location.latitude},${location.longitude}`;
          window.open(fallbackUrl, '_blank');
          
          // Show user-friendly message
          alert('Could not get your current location. Opening destination in Google Maps - you can set your starting point manually.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      // Geolocation not supported - open destination only
      const fallbackUrl = `https://www.google.com/maps/dir//${location.latitude},${location.longitude}`;
      window.open(fallbackUrl, '_blank');
      alert('Geolocation not supported. Opening destination in Google Maps - you can set your starting point manually.');
    }
  }

  turnOffLocationSharing(): void {
    if (this.locationTrackingService.isCurrentlyTracking()) {
      // Stop the location tracking service
      this.locationTrackingService.stopTracking();
      
      // Reset tracking status
      this.trackingStatus = { isTracking: false };
      
      // Show confirmation message
      alert('Location sharing has been turned off. The affected user will no longer see your tracking updates.');
      
      // Trigger change detection
      this.cdr.detectChanges();
    }
  }

  openCurrentLocationInGoogleMaps(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          
          // Open current location in Google Maps
          const mapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;
          window.open(mapsUrl, '_blank');
        },
        (error) => {
          console.error('Error getting current location:', error);
          
          // Fallback: Use last known location from tracking if available
          if (this.trackingStatus.lastUpdate) {
            const lat = this.trackingStatus.lastUpdate.latitude;
            const lng = this.trackingStatus.lastUpdate.longitude;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            window.open(mapsUrl, '_blank');
            alert('Using last known location for Google Maps.');
          } else {
            alert('Could not access your current location. Please enable location permissions.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  getPhotoUrl(photoPath: string): string {
    // If it's already a full URL, return it
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    // Otherwise, prepend the backend URL
    return `http://localhost:8000/${photoPath}`;
  }

  toggleLocationSharing(): void {
    if (!this.isLocationSharing) {
      this.startSharingLocation();
    } else {
      this.stopSharingLocationInternal();
    }
  }

  private async startSharingLocation(): Promise<void> {
    try {
      const position = await this.locationService.getCurrentPosition();
      this.lastPosition = position;
      
      // Save current position to localStorage for offline access
      this.savePositionLocally(position);
      
      // Update location on server
      this.updateLocationOnServer(position);

      this.isLocationSharing = true;
      localStorage.setItem('location_sharing_enabled', 'true');
      
      // Start watching position with high accuracy for movement detection
      this.watchId = this.locationService.watchPosition((pos) => {
        this.lastPosition = pos;
        this.savePositionLocally(pos);
        
        // Update current user marker on map
        this.updateCurrentUserMarker(pos);
        
        // Only update server if position changed significantly (> 10 meters)
        if (this.hasSignificantMovement(position, pos)) {
          this.updateLocationOnServer(pos);
        }
      });

      // Also update every 2 minutes even if no significant movement
      this.updateIntervalSubscription = interval(120000).subscribe(() => {
        if (this.lastPosition && this.isLocationSharing) {
          this.updateLocationOnServer(this.lastPosition);
        }
      });

      // Add/update marker for current user
      this.updateCurrentUserMarker(position);
      // Don't auto-center the map - let user control the view
      // this.map.setView([position.coords.latitude, position.coords.longitude], 13);
      
      // Show success message
      this.error = '';
      
    } catch (error) {
      this.error = 'Unable to access your location. Please enable location permissions.';
      console.error('Geolocation error:', error);
      this.isLocationSharing = false;
      localStorage.setItem('location_sharing_enabled', 'false');
    }
  }

  private updateLocationOnServer(position: GeolocationPosition): void {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    if (this.isOnline) {
      this.locationService.updateLocation(locationData).subscribe({
        next: () => {
          // Success - process any queued offline updates
          this.processOfflineQueue();
        },
        error: (err) => {
          console.error('Error updating location:', err);
          // Queue for later if offline
          this.queueLocationUpdate(locationData);
        }
      });
    } else {
      // Queue for later
      this.queueLocationUpdate(locationData);
    }
  }

  private hasSignificantMovement(oldPos: GeolocationPosition, newPos: GeolocationPosition): boolean {
    // Calculate distance in meters using Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = oldPos.coords.latitude * Math.PI / 180;
    const φ2 = newPos.coords.latitude * Math.PI / 180;
    const Δφ = (newPos.coords.latitude - oldPos.coords.latitude) * Math.PI / 180;
    const Δλ = (newPos.coords.longitude - oldPos.coords.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance > 10; // Return true if moved more than 10 meters
  }

  private updateCurrentUserMarker(position: GeolocationPosition): void {
    const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
    
    if (this.currentUserMarker) {
      // Update existing marker position
      this.currentUserMarker.setLatLng(coords);
    } else {
      // Create new marker
      this.currentUserMarker = L.marker(coords, {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      })
        .addTo(this.map)
        .bindPopup(`
          <div>
            <strong>Your Location</strong><br>
            <small>Accuracy: ±${position.coords.accuracy.toFixed(0)}m</small><br>
            <small>Updated: ${new Date().toLocaleTimeString()}</small>
          </div>
        `)
        .openPopup();
    }
  }

  private savePositionLocally(position: GeolocationPosition): void {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('last_known_position', JSON.stringify(locationData));
  }

  private queueLocationUpdate(locationData: any): void {
    this.offlineQueue.push({
      ...locationData,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('location_offline_queue', JSON.stringify(this.offlineQueue));
  }

  private saveOfflineQueue(): void {
    localStorage.setItem('location_offline_queue', JSON.stringify(this.offlineQueue));
  }

  private processOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;

    // Send the most recent location from queue
    const mostRecent = this.offlineQueue[this.offlineQueue.length - 1];
    
    this.locationService.updateLocation(mostRecent).subscribe({
      next: () => {
        // Clear queue on success
        this.offlineQueue = [];
        localStorage.removeItem('location_offline_queue');
      },
      error: (err) => {
        console.error('Failed to process offline queue:', err);
      }
    });
  }

  private handleOnline(): void {
    this.isOnline = true;
    console.log('Back online - processing queued updates');
    this.processOfflineQueue();
    
    // Resume location updates if sharing was enabled
    if (this.isLocationSharing && this.lastPosition) {
      this.updateLocationOnServer(this.lastPosition);
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    console.log('Gone offline - will queue location updates');
  }

  private stopSharingLocationInternal(): void {
    // Deactivate on backend if we have the location ID  
    const locationId = localStorage.getItem('anonymous_location_id');
    console.log('Stopping location sharing. Location ID:', locationId);
    
    if (locationId) {
      console.log('Calling deactivate API for location ID:', locationId);
      this.locationService.deactivateAnonymousLocation(parseInt(locationId)).subscribe({
        next: (response) => {
          console.log('Location sharing deactivated on server:', response);
          
          // Immediately reload locations to remove the marker from map
          this.loadLocations();
          
          // Clear the marker immediately for instant UI feedback
          if (this.currentUserMarker) {
            this.currentUserMarker.remove();
            this.currentUserMarker = undefined;
          }
        },
        error: (err) => {
          console.error('Error deactivating location:', err);
          console.error('Full error:', err);
        }
      });
    } else {
      console.log('No location ID found in localStorage');
    }
    
    // Clean up local state
    if (this.watchId) {
      this.locationService.clearWatch(this.watchId);
      this.watchId = undefined;
    }
    if (this.updateIntervalSubscription) {
      this.updateIntervalSubscription.unsubscribe();
    }
    if (this.currentUserMarker) {
      this.currentUserMarker.remove();
      this.currentUserMarker = undefined;
    }
    
    // Clear localStorage for anonymous location sharing
    this.isLocationSharing = false;
    localStorage.removeItem('location_sharing_enabled');
    localStorage.removeItem('anonymous_session_id');
    localStorage.removeItem('anonymous_location_id');
    localStorage.removeItem('phone_number');
    
    // Clear all user authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Redirect to home page
    this.router.navigate(['/']);
    
    console.log('User logged out and redirected to home page');
  }

  centerOnMyLocation(): void {
    // Try to get current position
    this.locationService.getCurrentPosition().then(position => {
      this.map.setView([position.coords.latitude, position.coords.longitude], 13);
    }).catch(error => {
      // Fallback to last known position if available
      const lastKnown = localStorage.getItem('last_known_position');
      if (lastKnown) {
        const pos = JSON.parse(lastKnown);
        this.map.setView([pos.latitude, pos.longitude], 13);
        this.error = 'Showing last known location (offline)';
      } else {
        this.error = 'Unable to access your location';
        console.error('Geolocation error:', error);
      }
    });
  }

  // Share Location Modal Methods
  openShareLocationModal(): void {
    // Check if user is already sharing location
    const existingData = localStorage.getItem('shared_user_data');
    if (existingData) {
      // Ask if they want to update their info
      if (confirm('You are already sharing your location. Do you want to update your contact information?')) {
        this.sharedUserData = JSON.parse(existingData);
        this.shareLocationForm.patchValue(this.sharedUserData);
        this.showShareModal = true;
        this.currentStep = 1; // Reset to first step
      }
    } else {
      // Pre-fill phone number from user profile if available
      const currentUser = this.authService.getCurrentUserValue();
      if (currentUser?.phone_number) {
        this.shareLocationForm.patchValue({
          phone: currentUser.phone_number
        });
      }
      
      this.showShareModal = true;
      this.currentStep = 1; // Reset to first step
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.shareLocationForm.reset();
    this.currentStep = 1;
    this.photoFile = null;
    this.photoPreview = null;
  }

  goToRegistration(): void {
    // Navigate to registration page for affected users
    this.router.navigate(['/register-affected']);
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
        const phoneControl = this.shareLocationForm.get('phone');
        return phoneControl?.valid || false;
        
      case 2:
        // Step 2: Photo is required
        return this.photoFile !== null;
        
      case 3:
        // Step 3: People count is required
        const peopleControl = this.shareLocationForm.get('supply_needs.people_count');
        return peopleControl?.valid || false;
        
      default:
        return false;
    }
  }
  
  // Photo handling methods (camera only)
  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('Photo size must be less than 5MB. Please try again.');
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

  async submitShareLocation(): Promise<void> {
    if (this.shareLocationForm.invalid) {
      return;
    }

    this.submitting = true;
    this.error = '';

    try {
      // Get current location
      const position = await this.locationService.getCurrentPosition();
      
      // Prepare form data for multipart upload
      const formData = new FormData();
      
      // Add basic contact info
      formData.append('phone', this.shareLocationForm.get('phone')?.value);
      formData.append('facebook', this.shareLocationForm.get('facebook')?.value || '');
      formData.append('email', this.shareLocationForm.get('email')?.value || '');
      formData.append('notes', this.shareLocationForm.get('notes')?.value || '');
      
      // Add location data
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
      formData.append('accuracy', position.coords.accuracy.toString());
      
      // Add photo (required)
      if (this.photoFile) {
        formData.append('photo', this.photoFile);
      }
      
      // Add supply needs as JSON string
      const supplyNeeds = this.shareLocationForm.get('supply_needs')?.value;
      formData.append('supply_needs', JSON.stringify(supplyNeeds));
      
      // Generate session ID if not exists
      let sessionId = localStorage.getItem('anonymous_session_id');
      if (!sessionId) {
        sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anonymous_session_id', sessionId);
      }
      formData.append('session_id', sessionId);

      // Save basic data to localStorage (without photo for size)
      const shareData = {
        phone: this.shareLocationForm.get('phone')?.value,
        facebook: this.shareLocationForm.get('facebook')?.value,
        email: this.shareLocationForm.get('email')?.value,
        notes: this.shareLocationForm.get('notes')?.value,
        supply_needs: supplyNeeds,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        session_id: sessionId
      };
      localStorage.setItem('shared_user_data', JSON.stringify(shareData));
      this.sharedUserData = shareData;
      this.lastPosition = position;

      // Start sharing location
      this.isLocationSharing = true;
      localStorage.setItem('location_sharing_enabled', 'true');
      
      // Send to server (no authentication required)
      this.sendAnonymousLocation(formData);

      // Start watching position
      this.watchId = this.locationService.watchPosition((pos) => {
        this.lastPosition = pos;
        this.savePositionLocally(pos);
        this.updateCurrentUserMarker(pos);
        
        // Update server if significant movement
        if (this.hasSignificantMovement(position, pos)) {
          const updatedFormData = new FormData();
          updatedFormData.append('phone', shareData.phone);
          updatedFormData.append('session_id', sessionId!);
          updatedFormData.append('latitude', pos.coords.latitude.toString());
          updatedFormData.append('longitude', pos.coords.longitude.toString());
          updatedFormData.append('accuracy', pos.coords.accuracy.toString());
          this.sendAnonymousLocation(updatedFormData);
        }
      });

      // Update every 2 minutes
      this.updateIntervalSubscription = interval(120000).subscribe(() => {
        if (this.lastPosition && this.isLocationSharing && this.sharedUserData) {
          const updatedFormData = new FormData();
          updatedFormData.append('phone', this.sharedUserData.phone);
          updatedFormData.append('session_id', sessionId!);
          updatedFormData.append('latitude', this.lastPosition.coords.latitude.toString());
          updatedFormData.append('longitude', this.lastPosition.coords.longitude.toString());
          updatedFormData.append('accuracy', this.lastPosition.coords.accuracy.toString());
          this.sendAnonymousLocation(updatedFormData);
        }
      });

      // Add marker for current user
      this.updateCurrentUserMarker(position);
      // Don't auto-center - let user control their view
      // this.map.setView([position.coords.latitude, position.coords.longitude], 13);

      // Close modal
      this.closeShareModal();
      this.submitting = false;

    } catch (error) {
      this.error = 'Unable to access your location. Please enable location permissions.';
      console.error('Geolocation error:', error);
      this.submitting = false;
    }
  }

  private sendAnonymousLocation(data: FormData | any): void {
    if (this.isOnline) {
      // Call backend API to save anonymous location
      this.locationService.shareAnonymousLocation(data).subscribe({
        next: (response) => {
          console.log('Location shared successfully:', response);
          // Store the ID from backend for future updates/deactivation
          if (response && response.id) {
            const userData = localStorage.getItem('shared_user_data');
            if (userData) {
              const parsedData = JSON.parse(userData);
              parsedData.backendId = response.id;
              localStorage.setItem('shared_user_data', JSON.stringify(parsedData));
            }
          }
        },
        error: (error) => {
          console.error('Error sharing location:', error);
          // Queue for retry if offline
          if (!this.isOnline) {
            this.offlineQueue.push({ type: 'share', data: data });
            this.saveOfflineQueue();
          }
        }
      });
    } else {
      // Queue for later when online
      this.offlineQueue.push({ type: 'share', data: data });
      this.saveOfflineQueue();
    }
  }

  stopSharingLocation(): void {
    if (confirm('Are you sure you want to stop sharing your location? You will be logged out and all your information will be deleted.')) {
      // Show loading indicator
      this.loading = true;
      this.error = '';
      
      this.stopSharingLocationInternal();
    }
  }

  // QR Code Modal Methods
  openQRModal(): void {
    // Get QR code from localStorage or current user
    const qrCode = localStorage.getItem('qr_code');
    const currentUser = localStorage.getItem('currentUser');
    
    if (qrCode) {
      this.userQRCode = qrCode;
      this.showQRModal = true;
    } else if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user.qr_code) {
          this.userQRCode = user.qr_code;
          this.showQRModal = true;
        } else {
          alert('QR code not found. Please register again.');
        }
      } catch (e) {
        alert('Error loading QR code');
      }
    } else {
      alert('QR code not found. Please register again.');
    }
  }

  closeQRModal(): void {
    this.showQRModal = false;
  }

  downloadQRCode(): void {
    const qrCanvas = document.querySelector('.qr-modal canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      const url = qrCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `my-donation-qr-${this.userQRCode}.png`;
      link.href = url;
      link.click();
    }
  }

  // Mark as On The Way Methods (for donators)
  markAsOnTheWay(location: AnonymousLocation): void {
    this.selectedLocationForDonation = location;
    this.showOnTheWayModal = true;
  }

  closeOnTheWayModal(): void {
    this.showOnTheWayModal = false;
    this.selectedLocationForDonation = null;
  }

  confirmOnTheWay(): void {
    if (!this.selectedLocationForDonation) return;

    const locationId = this.selectedLocationForDonation.id;
    
    // Check if user is authenticated
    const token = this.authService.getAccessToken();
    if (!token) {
      alert('You must be logged in as a donator to mark yourself as on the way.');
      this.closeOnTheWayModal();
      return;
    }

    this.loading = true;
    this.locationService.markAsOnTheWay(locationId).subscribe({
      next: (response) => {
        // Start location tracking after successfully marking as on the way
        this.locationTrackingService.startTracking(locationId).then(() => {
          alert('You have been marked as on the way! Location tracking started. The affected user will see your real-time updates.');
          this.closeOnTheWayModal();
          this.loadLocations(); // Refresh to show updated data
          this.loading = false;
        }).catch((trackingError) => {
          console.error('Error starting location tracking:', trackingError);
          alert('Marked as on the way, but location tracking failed. Please enable location permissions.');
          this.closeOnTheWayModal();
          this.loadLocations();
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Error marking as on the way:', err);
        if (err.status === 401) {
          alert('You must be logged in as a donator to mark yourself as on the way.');
        } else if (err.error?.error) {
          alert(err.error.error);
        } else {
          alert('Failed to mark as on the way. Please try again.');
        }
        this.loading = false;
        this.closeOnTheWayModal();
      }
    });
  }

  // QR Scanner Methods
  openScanner(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      alert('You must be logged in as a donator to scan QR codes.');
      return;
    }
    this.showScannerModal = true;
  }

  closeScannerModal(): void {
    this.showScannerModal = false;
  }

  onQRScanned(qrCode: string): void {
    console.log('QR Code scanned:', qrCode);
    this.closeScannerModal();
    this.loading = true;

    this.locationService.scanQRCode(qrCode).subscribe({
      next: (response) => {
        alert(`Donation confirmed! Thank you for helping.\n\nThe affected user's location has been removed and they can create a new request after 3 hours.`);
        this.loadLocations(); // Refresh locations to remove the donated location
        this.loading = false;
        
        // Note: The affected user will see their location removed when they refresh
        // They should navigate to /register/affected to create a new request after 3 hours
      },
      error: (err) => {
        console.error('Error scanning QR code:', err);
        this.loading = false;
        
        if (err.status === 404) {
          alert('Invalid QR code. Please make sure you scanned the correct code.');
        } else if (err.status === 400) {
          alert(err.error?.error || 'This location has already received a donation.');
        } else if (err.status === 401) {
          alert('You must be logged in as a donator to scan QR codes.');
        } else {
          alert('Failed to process QR code. Please try again.');
        }
      }
    });
  }

  // WebSocket methods for real-time donation notifications
  private initializeWebSocket(): void {
    if (!this.currentSessionId) return;

  // Use environment websocket URL if available (supports wss in production)
  // environment.wsUrl is like 'wss://relief-hero.onrender.com/ws'
  const baseWs = environment?.wsUrl || ((typeof (window) !== 'undefined') ? ((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws') : 'ws://localhost:8000/ws');
  const wsUrl = `${baseWs.replace(/\/$/, '')}/locations/`;
    
    try {
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already open');
        return;
      }
      this.webSocket = new WebSocket(wsUrl);
      
      this.webSocket.onopen = () => {
        console.log('WebSocket connected for session:', this.currentSessionId);
      };
      
      this.webSocket.onmessage = (event) => {
        console.log('Raw WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', data);
        
        if (data.type === 'qr_scan_notification') {
          this.handleQRScanNotification(data.data);
        } else if (data.type === 'donator_tracking_update') {
          this.handleDonatorTrackingUpdate(data.data);
        }
      };
      
      this.webSocket.onclose = () => {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after 3 seconds if component is still active
        if (this.currentSessionId) {
          setTimeout(() => {
            this.initializeWebSocket();
          }, 3000);
        }
      };
      
      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private handleQRScanNotification(data: DonationNotification): void {
    console.log('Handling QR scan notification:', data);
    
    // Check if this notification is for the current session
    if (data.session_id === this.currentSessionId) {
      console.log('QR scan notification matches current session - showing confirmation modal');
      
      this.donationNotificationData = data;
      this.showDonationConfirmationModal = true;
      this.cdr.detectChanges();
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Donation Received!', {
          body: `${data.donator_name} has scanned your QR code and provided relief supplies.`,
          icon: '/assets/icons/donation-icon.png'
        });
      }
    }
  }

  private handleDonatorTrackingUpdate(data: any): void {
    console.log('Handling donator tracking update:', data);
    
    // Get current user to determine if this is their own tracking update
    const currentUser = this.authService.getCurrentUserValue();
    const isOwnTracking = currentUser && currentUser.id === data.donatorId;
    
    // Only update tracking status if:
    // 1. User is affected and this is from another donator, OR
    // 2. User is donator and this is their own tracking update
    const shouldShowNotification = (this.isAffectedUser && !isOwnTracking) || (!this.isAffectedUser && isOwnTracking);
    
    if (!shouldShowNotification) {
      return; // Don't show notification for this update
    }
    
    // Update the tracking status for the notification display
    if (data.status === 'tracking_started') {
      this.trackingStatus = {
        isTracking: true,
        donatorInfo: {
          id: data.donatorId,
          username: data.donatorUsername,
          firstName: data.donatorFirstName,
          lastName: data.donatorLastName
        },
        lastUpdate: {
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          accuracy: data.accuracy || 0,
          timestamp: new Date(data.timestamp),
          donatorId: data.donatorId,
          donatorUsername: data.donatorUsername,
          locationId: data.locationId
        }
      };
    } else if (data.status === 'tracking_stopped') {
      this.trackingStatus = { isTracking: false };
    } else if (data.latitude && data.longitude) {
      // Regular location update
      if (this.trackingStatus.isTracking && this.trackingStatus.donatorInfo?.id === data.donatorId) {
        this.trackingStatus.lastUpdate = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          timestamp: new Date(data.timestamp),
          donatorId: data.donatorId,
          donatorUsername: data.donatorUsername,
          locationId: data.locationId
        };
      }
    }
    
    this.cdr.detectChanges();
    
    // Show browser notification for tracking start (only for affected users)
    if (data.status === 'tracking_started' && this.isAffectedUser && Notification.permission === 'granted') {
      new Notification('Donator On The Way!', {
        body: data.message,
        icon: '/assets/icons/donation-icon.png'
      });
    }
  }

  // Modal methods for donation confirmation
  closeDonationConfirmationModal(): void {
    this.showDonationConfirmationModal = false;
    this.donationNotificationData = null;
    this.cdr.detectChanges();
  }

  onSubmitRating(ratingData: { rating: number; comment: string; supplies_confirmed: any }): void {
    if (!this.donationNotificationData || !this.currentSessionId) return;

    const requestData = {
      donation_history_id: this.donationNotificationData.donation_history_id,
      session_id: this.currentSessionId,
      rating: ratingData.rating,
      comment: ratingData.comment,
      supplies_confirmed: ratingData.supplies_confirmed
    };

    this.donationService.submitRating(requestData).subscribe({
      next: (response) => {
        console.log('Rating submitted successfully:', response);
        alert('Thank you for your feedback! Your rating has been submitted.');
        this.closeDonationConfirmationModal();
        
        // Reload locations to show updated state
        this.loadLocations();
      },
      error: (err) => {
        console.error('Error submitting rating:', err);
        alert('Failed to submit rating. Please try again.');
      }
    });
  }

  // Helper method to format tracking timestamp
  public formatTrackingTime(timestamp: Date): string {
    const now = new Date();
    const timeDiff = now.getTime() - new Date(timestamp).getTime();
    const secondsAgo = Math.floor(timeDiff / 1000);
    
    if (secondsAgo < 60) {
      return `${secondsAgo} seconds ago`;
    } else if (secondsAgo < 3600) {
      const minutesAgo = Math.floor(secondsAgo / 60);
      return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
    } else {
      const hoursAgo = Math.floor(secondsAgo / 3600);
      return `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
    }
  }

  // Icon helper method for template
  getIcon(name: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
    return this.iconService.getIcon(name, size);
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.warn('Failed to load image:', event.target.src);
    event.target.style.display = 'none';
  }

}
