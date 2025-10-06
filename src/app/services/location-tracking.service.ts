import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  donatorId: number;
  donatorUsername: string;
  locationId: number;
}

export interface TrackingStatus {
  isTracking: boolean;
  donatorInfo?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  lastUpdate?: LocationUpdate;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationTrackingService {
  private trackingSubject = new BehaviorSubject<TrackingStatus>({ isTracking: false });
  private watchId: number | null = null;
  private updateInterval: Subscription | null = null;
  private currentLocationId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  get trackingStatus$(): Observable<TrackingStatus> {
    return this.trackingSubject.asObservable();
  }

  startTracking(locationId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser';
        this.trackingSubject.next({ isTracking: false, error });
        reject(new Error(error));
        return;
      }

      // Get current user info
      const currentUser = this.authService.getCurrentUserValue();
      if (!currentUser) {
        const error = 'User must be logged in to start tracking';
        this.trackingSubject.next({ isTracking: false, error });
        reject(new Error(error));
        return;
      }

      this.currentLocationId = locationId;

      const options = {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 30000, // Increased timeout to 30 seconds
        maximumAge: 60000 // Allow cached location up to 1 minute
      };

      // First try to get current position to ensure location access works
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success with getCurrentPosition, now start watching
          this.startWatchingPosition(currentUser, locationId, options, resolve, reject);
        },
        (error) => {
          console.error('Initial geolocation error:', error);
          
          // Try with less accurate but faster options
          const fallbackOptions = {
            enableHighAccuracy: false,
            timeout: 60000, // 1 minute timeout
            maximumAge: 300000 // Allow 5 minute old cached location
          };
          
          console.log('Trying fallback geolocation options...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Fallback location success, starting tracking...');
              this.startWatchingPosition(currentUser, locationId, fallbackOptions, resolve, reject);
            },
            (fallbackError) => {
              console.error('Fallback geolocation also failed:', fallbackError);
              let errorMessage = 'Location access denied or unavailable';
              
              switch (fallbackError.code) {
                case fallbackError.PERMISSION_DENIED:
                  errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
                  break;
                case fallbackError.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information is unavailable. Please ensure GPS/location services are enabled.';
                  break;
                case fallbackError.TIMEOUT:
                  errorMessage = 'Location request timed out. Please try again or check your internet connection.';
                  break;
              }

              this.trackingSubject.next({ isTracking: false, error: errorMessage });
              reject(new Error(errorMessage));
            },
            fallbackOptions
          );
        },
        options
      );

      // Set up periodic updates every 10 seconds
      this.updateInterval = interval(10000).subscribe(() => {
        if (this.watchId !== null) {
          // The watchPosition will automatically trigger updates
          console.log('Location tracking active...');
        }
      });
    });
  }

  private startWatchingPosition(
    currentUser: any, 
    locationId: number, 
    options: PositionOptions,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    // Start continuous position watching
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationUpdate: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
          donatorId: currentUser.id,
          donatorUsername: currentUser.email.split('@')[0],
          locationId: locationId
        };

        // Send location update to backend
        this.sendLocationUpdate(locationUpdate);

        // Update tracking status
        this.trackingSubject.next({
          isTracking: true,
          donatorInfo: {
            id: currentUser.id,
            username: currentUser.email.split('@')[0],
            firstName: currentUser.first_name || '',
            lastName: currentUser.last_name || ''
          },
          lastUpdate: locationUpdate
        });

        resolve();
      },
      (error) => {
        console.error('Watch position error:', error);
        let errorMessage = 'Location tracking failed';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out during tracking.';
            break;
        }

        this.trackingSubject.next({ isTracking: false, error: errorMessage });
        reject(new Error(errorMessage));
      },
      options
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      this.updateInterval.unsubscribe();
      this.updateInterval = null;
    }

    // Notify backend that tracking has stopped
    if (this.currentLocationId) {
      this.stopLocationTracking(this.currentLocationId).subscribe({
        next: () => console.log('Tracking stopped successfully'),
        error: (err) => console.error('Error stopping tracking:', err)
      });
    }

    this.currentLocationId = null;
    this.trackingSubject.next({ isTracking: false });
  }

  private sendLocationUpdate(locationUpdate: LocationUpdate): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${environment.apiUrl}/location-updates/`, locationUpdate, { headers })
      .subscribe({
        next: (response) => {
          console.log('Location update sent successfully:', response);
        },
        error: (error) => {
          console.error('Error sending location update:', error);
          // Don't stop tracking on single update failure
        }
      });
  }

  private stopLocationTracking(locationId: number): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken()}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${environment.apiUrl}/stop-tracking/`, { locationId }, { headers });
  }

  // Get current tracking status
  getCurrentTrackingStatus(): TrackingStatus {
    return this.trackingSubject.value;
  }

  // Check if currently tracking
  isCurrentlyTracking(): boolean {
    return this.trackingSubject.value.isTracking;
  }
}