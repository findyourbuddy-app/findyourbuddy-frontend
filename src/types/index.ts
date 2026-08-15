export interface UserPhoto {
  id: number;
  photo_url: string;
  position: number;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  is_active: boolean;
  age: number | null;
  date_of_birth: string | null;
  occupation: string | null;
  university: string | null;
  zodiac_sign: string | null;
  verification_status: string;
  looking_for: string | null;
  about_me_prompt: string | null;
  voice_note_url: string | null;
  bio: string | null;
  interests: string[];
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  accepted_terms_at: string | null;
  created_at: string;
  photos: UserPhoto[];
  trust_score: number;
  boosted_until?: string | null;
  boosts_balance?: number;
  extra_super_likes?: number;
  phone_number: string;
  phone_verified: boolean;
}

export interface UserUpdate {
  display_name?: string;
  date_of_birth?: string;
  occupation?: string;
  university?: string | null;
  zodiac_sign?: string | null;
  looking_for?: string | null;
  about_me_prompt?: string | null;
  voice_note_url?: string | null;
  bio?: string;
  interests?: string[];
  latitude?: number;
  longitude?: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
  accepted_terms: boolean;
  phone_number: string;
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
  creator_id: number | null;
  source: string | null;
  external_id: string | null;
  source_url: string | null;
  image_url: string | null;
  is_group_event: boolean;
  max_attendees: number | null;
  is_paid: boolean;
  creator?: UserPublic | null;
  created_at: string;
  attendee_count: number;
  is_attending: boolean;
  is_checked_in: boolean;
  is_ticket_verified: boolean;
}

export interface EventCreate {
  title: string;
  description?: string;
  category: string;
  location_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  is_group_event?: boolean;
  max_attendees?: number | null;
  is_paid?: boolean;
}

export type SwipeDirection = "like" | "pass" | "super_like";

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
  match_id: number | null;
  matched_user: UserPublic | null;
}

export interface UserPublic {
  id: number;
  display_name: string;
  photo_url: string | null;
  trust_score: number;
  university: string | null;
}

export interface Message {
  id: number;
  match_id: number;
  sender_id: number;
  content: string;
  message_type?: "text" | "image" | "gif";
  media_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MessageCreate {
  content: string;
  message_type?: "text" | "image" | "gif";
  media_url?: string | null;
}

export type ReportReason = "harassment" | "spam" | "fake_profile" | "inappropriate_content" | "other";

export interface Block {
  id: number;
  blocker_id: number;
  blocked_id: number;
  created_at: string;
}

export interface BlockedUser {
  id: number;
  blocked_user: UserPublic;
  created_at: string;
}

export interface ReportCreate {
  reported_user_id: number;
  reason: ReportReason;
  description?: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Bookmark {
  id: number;
  event: Event;
  created_at: string;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  expires_at: string | null;
}

export interface Match {
  id: number;
  event_id: number;
  user_a_id: number;
  user_b_id: number;
  score: number;
  created_at: string;
  other_user: UserPublic;
  last_message: Message | null;
  needs_feedback: boolean;
}
