import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Donation, CreateDonationRequest, DonationTracking } from '../models/donation.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DonationService {
  private apiUrl = `${environment.apiUrl}/donations`;

  constructor(private http: HttpClient) {}

  /**
   * Get all donations with optional filters
   */
  getDonations(filters?: {
    status?: string;
    category?: string;
    my_donations?: boolean;
  }): Observable<Donation[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.my_donations) params = params.set('my_donations', 'true');
    }

    return this.http.get<Donation[]>(this.apiUrl + '/', { params });
  }

  /**
   * Get a single donation by ID
   */
  getDonation(id: number): Observable<Donation> {
    return this.http.get<Donation>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Create a new donation
   */
  createDonation(data: CreateDonationRequest): Observable<Donation> {
    return this.http.post<Donation>(this.apiUrl + '/', data);
  }

  /**
   * Update donation
   */
  updateDonation(id: number, data: Partial<Donation>): Observable<Donation> {
    return this.http.patch<Donation>(`${this.apiUrl}/${id}/`, data);
  }

  /**
   * Update donation status
   */
  updateDonationStatus(id: number, status: string, notes?: string): Observable<Donation> {
    return this.http.post<Donation>(
      `${this.apiUrl}/${id}/update_status/`,
      { status, notes }
    );
  }

  /**
   * Assign recipient to donation
   */
  assignRecipient(donationId: number, recipientId: number): Observable<Donation> {
    return this.http.post<Donation>(
      `${this.apiUrl}/${donationId}/assign_recipient/`,
      { recipient_id: recipientId }
    );
  }

  /**
   * Delete donation
   */
  deleteDonation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Get donation tracking history
   */
  getDonationTracking(donationId: number): Observable<DonationTracking[]> {
    const params = new HttpParams().set('donation', donationId.toString());
    return this.http.get<DonationTracking[]>(`${environment.apiUrl}/tracking/`, { params });
  }

  /**
   * Get all QR-based donation history (public)
   */
  getDonationHistory(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/donation-history/`);
  }

  /**
   * Get authenticated donator's personal donation history
   */
  getMyDonationHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/donation-history/my-donations/`);
  }

  /**
   * Get contributors ranking based on QR donation activity
   */
  getContributorsRanking(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/donation-history/contributors_ranking/`);
  }

  /**
   * Submit rating and supply confirmation for a donation
   */
  submitRating(ratingData: {
    donation_history_id: number;
    session_id: string;
    rating: number;
    comment: string;
    supplies_confirmed: any;
  }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/donation-ratings/`, ratingData);
  }

  /**
   * Get donator's acknowledgments with supply confirmations (authenticated)
   */
  getDonatorAcknowledgments(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/donation-history/donator_acknowledgments/`);
  }
}
