// Donation model
export interface Donation {
  id: number;
  donator: number;
  donator_name: string;
  donator_email: string;
  recipient?: number;
  recipient_name?: string;
  title: string;
  description: string;
  category: DonationCategory;
  quantity: number;
  unit: string;
  status: DonationStatus;
  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_location?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  image?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  notes?: string;
}

export type DonationCategory = 'food' | 'water' | 'clothing' | 'medicine' | 'shelter' | 'hygiene' | 'other';

export type DonationStatus = 'pending' | 'approved' | 'in_transit' | 'delivered' | 'cancelled';

export interface CreateDonationRequest {
  title: string;
  description: string;
  category: DonationCategory;
  quantity: number;
  unit: string;
  pickup_location: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_location?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  notes?: string;
}

export interface DonationTracking {
  id: number;
  donation: number;
  status: DonationStatus;
  notes?: string;
  latitude?: number;
  longitude?: number;
  updated_by?: number;
  updated_by_name?: string;
  timestamp: string;
}
