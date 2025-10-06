import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, interval, switchMap } from 'rxjs';
import { Location, CreateLocationRequest } from '../models/location.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private apiUrl = `${environment.apiUrl}/locations`;

  constructor(private http: HttpClient) {}

  /**
   * Get all locations with optional filters
   */
  getLocations(filters?: {
    user?: number;
    current_only?: boolean;
  }): Observable<Location[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.user) params = params.set('user', filters.user.toString());
      if (filters.current_only) params = params.set('current_only', 'true');
    }

    return this.http.get<Location[]>(this.apiUrl + '/', { params });
  }

  /**
   * Get current locations of affected users
   */
  getAffectedUsersLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/affected_users/`);
  }

  /**
   * Create/update location
   */
  updateLocation(data: CreateLocationRequest): Observable<Location> {
    return this.http.post<Location>(this.apiUrl + '/', data);
  }

  /**
   * Get current geolocation from browser
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      }
    });
  }

  /**
   * Watch position changes with high accuracy
   */
  watchPosition(callback: (position: GeolocationPosition) => void): number {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }
    
    return navigator.geolocation.watchPosition(callback, (error) => {
      console.error('Error watching position:', error);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000 // Accept cached position if less than 5 seconds old
    });
  }

  /**
   * Clear position watch
   */
  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }

  /**
   * Start periodic location updates
   */
  startLocationUpdates(intervalMs: number = 30000): Observable<Location[]> {
    return interval(intervalMs).pipe(
      switchMap(() => this.getAffectedUsersLocations())
    );
  }

  /**
   * Share anonymous location (no authentication required)
   * Accepts both JSON data and FormData (for photo uploads)
   */
  shareAnonymousLocation(data: FormData | {
    phone: string;
    facebook?: string;
    email?: string;
    notes?: string;
    photo?: File;
    supply_needs?: any;
    latitude: number;
    longitude: number;
    accuracy?: number;
    session_id?: string;
  }): Observable<any> {
    // If data is FormData, send as multipart; otherwise send as JSON
    if (data instanceof FormData) {
      // Try with HttpClient but ensure multipart handling
      return this.http.post(`${environment.apiUrl}/anonymous-locations/`, data, {
        // Explicitly do not set Content-Type to let browser handle multipart boundary
        headers: {}
      });
    } else {
      return this.http.post(`${environment.apiUrl}/anonymous-locations/`, data);
    }
  }

  /**
   * Get all active anonymous locations
   */
  getActiveAnonymousLocations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/anonymous-locations/active/`);
  }

  /**
   * Deactivate anonymous location sharing
   */
  deactivateAnonymousLocation(id: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/anonymous-locations/${id}/deactivate/`, {});
  }

  /**
   * Mark donator as on the way to a location
   */
  markAsOnTheWay(locationId: number): Observable<any> {
    return this.http.post(`${environment.apiUrl}/anonymous-locations/${locationId}/mark_on_the_way/`, {});
  }

  /**
   * Scan QR code to confirm donation
   */
  scanQRCode(qrCode: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/anonymous-locations/scan_qr_code/`, { qr_code: qrCode });
  }
}
