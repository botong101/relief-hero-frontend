// Location model
export interface Location {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  is_current: boolean;
  accuracy?: number;
}

export interface CreateLocationRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Emergency Request model
export interface EmergencyRequest {
  id: number;
  requester: number;
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'fulfilled' | 'closed';
  quantity_needed: number;
  unit: string;
  location: string;
  latitude: number;
  longitude: number;
  people_affected: number;
  created_at: string;
  updated_at: string;
  fulfilled_at?: string;
}

export interface CreateEmergencyRequest {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  quantity_needed: number;
  unit: string;
  location: string;
  latitude: number;
  longitude: number;
  people_affected: number;
}
