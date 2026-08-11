export interface User {
  id: number;
  email: string;
  display_name: string;
  is_active: boolean;
  age: number | null;
  bio: string | null;
  interests: string[];
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
}

export interface UserUpdate {
  display_name?: string;
  age?: number;
  bio?: string;
  interests?: string[];
  latitude?: number;
  longitude?: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  category: string;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  creator_id: number;
  created_at: string;
}

export interface EventCreate {
  title: string;
  description?: string;
  category: string;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
}

export type SwipeDirection = "like" | "pass";

export interface SwipeCreate {
  target_id: number;
  event_id: number;
  direction: SwipeDirection;
}

export interface Swipe {
  id: number;
  swiper_id: number;
  target_id: number;
  event_id: number;
  direction: SwipeDirection;
  created_at: string;
}

export interface Match {
  id: number;
  event_id: number;
  user_a_id: number;
  user_b_id: number;
  score: number;
  created_at: string;
}
