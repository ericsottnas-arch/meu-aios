export type UserRole = 'admin' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  client_id: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  slug: string
  name: string
  type: string | null
  category: string | null
  status: 'active' | 'onboarding' | 'prospect' | 'inactive'
  priority: 'premium' | 'growth' | 'standard'
  location: string | null
  specialty: string | null
  contact: Record<string, string> | null
  brand: Record<string, string> | null
  celo_config: Record<string, unknown> | null
  integrations: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id'>>
      }
    }
  }
}
