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
  class_year: string | null;
  zodiac_sign: string | null;
  gender: string | null;
  height: number | null;
  political_views?: string | null;
  beliefs?: string | null;
  languages_spoken?: string[];
  hidden_fields?: string[];
  verification_status: string;
  looking_for: string | null;
  about_me_prompt: string | null;
  voice_note_url: string | null;
  bio: string | null;
  interests: string[];
  hobbies?: string[];
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
  event_credits_balance?: number;
  phone_number?: string | null;
  phone_verified: boolean;
  is_verified?: boolean;
  event_title?: string | null;
}

export interface UserUpdate {
  display_name?: string;
  date_of_birth?: string;
  occupation?: string;
  university?: string | null;
  class_year?: string | null;
  zodiac_sign?: string | null;
  gender?: string | null;
  height?: number | null;
  political_views?: string | null;
  beliefs?: string | null;
  languages_spoken?: string[];
  looking_for?: string | null;
  about_me_prompt?: string | null;
  voice_note_url?: string | null;
  bio?: string;
  interests?: string[];
  hobbies?: string[];
  hidden_fields?: string[];
  latitude?: number;
  longitude?: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
  accepted_terms: boolean;
  phone_number?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
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
  ticket_price: number | null;
  creator?: UserPublic | null;
  created_at: string;
  attendee_count: number;
  is_attending: boolean;
  is_pending: boolean;
  is_checked_in: boolean;
  is_ticket_verified: boolean;
  has_rated?: boolean;
}

export interface EventPublicSummary {
  id: number;
  title: string;
  category: string;
  starts_at: string;
  location_name: string;
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
  ticket_price?: number | null;
  image_url?: string | null;
}

export interface EventCreationQuota {
  is_premium: boolean;
  events_created_this_week: number;
  weekly_limit: number | null;
  credits_balance: number;
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
  is_verified?: boolean;
}

export interface Message {
  // Postgres-sourced history has numeric ids; Firestore-sourced live
  // messages (see ChatScreen) use Firestore's string document ids.
  id: number | string;
  match_id: number;
  sender_id: number;
  content: string;
  message_type?: "text" | "image" | "gif";
  media_url?: string | null;
  is_read: boolean;
  created_at: string;
  reactions?: Record<string, string>;
  // Optimistic-send bookkeeping: the local temp id echoed back through
  // Firestore so the snapshot listener can drop the right placeholder.
  client_temp_id?: string | null;
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
  event_id?: number | null;
  match_id?: number | null;
  notification_type?: string | null;
  data?: Record<string, any> | null;
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
  event_title?: string | null;
  event_category?: string | null;
  event_is_group?: boolean;
  event_creator_id?: number | null;
  user_a_id: number;
  user_b_id: number;
  score: number;
  created_at: string;
  other_user: UserPublic;
  last_message: Message | null;
  needs_feedback: boolean;
}
