import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Province {
  code: string;
  name: string;
}

export interface City {
  code: string;
  name: string;
}

export interface Barangay {
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  // Using the free PSGC API
  private readonly baseUrl = 'https://psgc.gitlab.io/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all provinces/regions
   */
  getProvinces(): Observable<Province[]> {
    return this.http.get<any>(`${this.baseUrl}/provinces/`).pipe(
      map((data) => {
        // Transform API response to our format
        if (Array.isArray(data)) {
          return data
            .map((item: any) => ({
              code: item.code,
              name: item.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching provinces:', error);
        return of([]);
      })
    );
  }

  /**
   * Get cities/municipalities by province code
   */
  getCitiesByProvince(provinceCode: string): Observable<City[]> {
    return this.http.get<any>(`${this.baseUrl}/provinces/${provinceCode}/cities-municipalities/`).pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data
            .map((item: any) => ({
              code: item.code,
              name: item.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching cities:', error);
        return of([]);
      })
    );
  }

  /**
   * Get barangays by city code
   */
  getBarangaysByCity(cityCode: string): Observable<Barangay[]> {
    return this.http.get<any>(`${this.baseUrl}/cities-municipalities/${cityCode}/barangays/`).pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data
            .map((item: any) => ({
              code: item.code,
              name: item.name
            }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching barangays:', error);
        return of([]);
      })
    );
  }

  /**
   * Format full address string
   */
  formatAddress(barangay: string, city: string, province: string): string {
    return `${barangay}, ${city}, ${province}`;
  }
}
