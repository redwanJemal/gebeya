/**
 * API client for Gebeya backend
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('access_token');
  }
  return accessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  telegram: (initData: string) =>
    request<{ access_token: string; user: User }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData }),
    }),
};

// Users API
export const usersApi = {
  me: () => request<User>('/users/me'),
  updateProfile: (data: { city?: string; area?: string }) =>
    request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  verifyPhone: (phoneNumber: string) =>
    request<User>('/users/me/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    }),
  updateSettings: (settings: Record<string, any>) =>
    request<User>('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    }),
};

// Categories API
export const categoriesApi = {
  list: () => request<Category[]>('/categories'),
  get: (slug: string) => request<Category>(`/categories/${slug}`),
};

// Listings API
export const listingsApi = {
  list: (params: ListingsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.per_page) searchParams.set('per_page', String(params.per_page));
    if (params.category) searchParams.set('category', params.category);
    if (params.search) searchParams.set('search', params.search);
    if (params.min_price) searchParams.set('min_price', String(params.min_price));
    if (params.max_price) searchParams.set('max_price', String(params.max_price));
    if (params.condition) searchParams.set('condition', params.condition);
    if (params.city) searchParams.set('city', params.city);
    
    const query = searchParams.toString();
    return request<ListingsResponse>(`/listings${query ? `?${query}` : ''}`);
  },
  
  get: (id: string) => request<Listing>(`/listings/${id}`),
  
  create: (data: CreateListing) =>
    request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<CreateListing>) =>
    request<Listing>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    request<{ message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    }),
  
  my: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return request<Listing[]>(`/listings/my${query}`);
  },
  
  toggleFavorite: (id: string) =>
    request<{ favorited: boolean }>(`/listings/${id}/favorite`, {
      method: 'POST',
    }),
};

// Types
export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  is_premium: boolean;
  language_code: string | null;
  phone: string | null;
  is_phone_verified: boolean;
  city: string;
  area: string | null;
  rating: number;
  total_sales: number;
  total_listings: number;
  is_verified_seller: boolean;
  is_admin: boolean;
  settings?: Record<string, any>;
}

export interface Category {
  id: string;
  name_am: string;
  name_en: string;
  icon: string;
  slug: string;
  parent_id: string | null;
}

export interface SellerInfo {
  id: string;
  name: string;
  username: string | null;
  is_verified: boolean;
  rating: number;
  total_sales: number;
  member_since: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  is_negotiable: boolean;
  condition: 'new' | 'like_new' | 'used' | 'for_parts';
  images: string[];
  city: string;
  area: string | null;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'deleted';
  views_count: number;
  favorites_count: number;
  is_featured: boolean;
  created_at: string;
  category_id: string;
  category_name?: string;
  seller?: SellerInfo;
  is_favorited?: boolean;
}

export interface ListingsParams {
  page?: number;
  per_page?: number;
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  city?: string;
}

export interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Chat types
export interface ChatListItem {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_price: number;
  other_user_id: string;
  other_user_name: string;
  other_user_verified: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_seller: boolean;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  text: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

export interface ChatDetail {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_price: number;
  listing_status: string;
  other_user_id: string;
  other_user_name: string;
  other_user_verified: boolean;
  is_seller: boolean;
  messages: ChatMessage[];
}

// Chats API
export const chatsApi = {
  list: () => request<ChatListItem[]>('/chats'),
  
  create: (listingId: string) =>
    request<ChatDetail>(`/chats?listing_id=${listingId}`, {
      method: 'POST',
    }),
  
  get: (chatId: string) => request<ChatDetail>(`/chats/${chatId}`),
  
  sendMessage: (chatId: string, text: string) =>
    request<ChatMessage>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  
  getMessages: (chatId: string, after?: string) => {
    const params = after ? `?after=${encodeURIComponent(after)}` : '';
    return request<ChatMessage[]>(`/chats/${chatId}/messages${params}`);
  },
};

export interface CreateListing {
  title: string;
  description?: string;
  price: number;
  category_id: string;
  condition?: 'new' | 'like_new' | 'used' | 'for_parts';
  is_negotiable?: boolean;
  city?: string;
  area?: string;
  images?: string[];
}

// Demo API
export const demoApi = {
  seedListings: () =>
    request<{ message: string; listings: string[] }>('/demo/seed-listings', {
      method: 'POST',
    }),
  autoSeed: () =>
    request<{ seeded: boolean; count?: number; reason?: string }>('/demo/auto-seed', {
      method: 'POST',
    }),
};
