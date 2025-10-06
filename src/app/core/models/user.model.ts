// User model
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'donator' | 'affected' | 'admin';
  phone_number?: string;
  address?: string;
  profile_picture?: string;
  is_location_shared: boolean;
  created_at: string;
  updated_at: string;
}

// Auth response
export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

// Login/Register request
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  role: 'donator' | 'affected';
  phone_number?: string;
  address?: string;
}
