export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      buyer_profiles: {
        Row: {
          business_name: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          profile_id: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          profile_id: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          profile_id?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buying_requests: {
        Row: {
          buyer_id: string
          category_id: string | null
          created_at: string
          crop_name: string
          currency: string
          description: string | null
          desired_grade: Database["public"]["Enums"]["produce_grade"] | null
          destination_city: string | null
          destination_region: string
          id: string
          quantity: number
          required_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          target_price_per_unit: number | null
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          category_id?: string | null
          created_at?: string
          crop_name: string
          currency?: string
          description?: string | null
          desired_grade?: Database["public"]["Enums"]["produce_grade"] | null
          destination_city?: string | null
          destination_region: string
          id?: string
          quantity: number
          required_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          target_price_per_unit?: number | null
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          category_id?: string | null
          created_at?: string
          crop_name?: string
          currency?: string
          description?: string | null
          desired_grade?: Database["public"]["Enums"]["produce_grade"] | null
          destination_city?: string | null
          destination_region?: string
          id?: string
          quantity?: number
          required_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          target_price_per_unit?: number | null
          unit?: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buying_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "buying_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_profiles: {
        Row: {
          bio: string | null
          created_at: string
          profile_id: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          years_farming: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          profile_id: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          years_farming?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          profile_id?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          years_farming?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          community: string | null
          created_at: string
          district: string | null
          farmer_id: string
          id: string
          name: string
          region: string
          size_hectares: number | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          community?: string | null
          created_at?: string
          district?: string | null
          farmer_id: string
          id?: string
          name: string
          region: string
          size_hectares?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          community?: string | null
          created_at?: string
          district?: string | null
          farmer_id?: string
          id?: string
          name?: string
          region?: string
          size_hectares?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "farms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          available_date: string | null
          category_id: string
          city: string | null
          created_at: string
          crop_name: string
          currency: string
          delivery_available: boolean
          description: string | null
          farm_id: string | null
          farmer_id: string
          grade: Database["public"]["Enums"]["produce_grade"]
          harvest_date: string | null
          id: string
          price_per_unit: number
          quantity_available: number
          region: string
          search: unknown
          status: Database["public"]["Enums"]["listing_status"]
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at: string
          variety: string | null
          version: number
        }
        Insert: {
          available_date?: string | null
          category_id: string
          city?: string | null
          created_at?: string
          crop_name: string
          currency?: string
          delivery_available?: boolean
          description?: string | null
          farm_id?: string | null
          farmer_id: string
          grade?: Database["public"]["Enums"]["produce_grade"]
          harvest_date?: string | null
          id?: string
          price_per_unit: number
          quantity_available: number
          region: string
          search?: unknown
          status?: Database["public"]["Enums"]["listing_status"]
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
          variety?: string | null
          version?: number
        }
        Update: {
          available_date?: string | null
          category_id?: string
          city?: string | null
          created_at?: string
          crop_name?: string
          currency?: string
          delivery_available?: boolean
          description?: string | null
          farm_id?: string | null
          farmer_id?: string
          grade?: Database["public"]["Enums"]["produce_grade"]
          harvest_date?: string | null
          id?: string
          price_per_unit?: number
          quantity_available?: number
          region?: string
          search?: unknown
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
          variety?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          listing_id: string
          message: string | null
          price_per_unit: number
          quantity: number
          responded_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          listing_id: string
          message?: string | null
          price_per_unit: number
          quantity: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          listing_id?: string
          message?: string | null
          price_per_unit?: number
          quantity?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "offers_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          crop_name: string
          id: string
          line_total: number | null
          listing_id: string | null
          order_id: string
          price_per_unit: number
          quantity: number
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          crop_name: string
          id?: string
          line_total?: number | null
          listing_id?: string | null
          order_id: string
          price_per_unit: number
          quantity: number
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          crop_name?: string
          id?: string
          line_total?: number | null
          listing_id?: string | null
          order_id?: string
          price_per_unit?: number
          quantity?: number
          unit?: Database["public"]["Enums"]["produce_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          cancel_reason: string | null
          created_at: string
          currency: string
          delivery_address: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          farmer_id: string
          id: string
          notes: string | null
          offer_id: string | null
          order_number: string
          request_offer_id: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancel_reason?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          farmer_id: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          order_number?: string
          request_offer_id?: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancel_reason?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          farmer_id?: string
          id?: string
          notes?: string | null
          offer_id?: string | null
          order_number?: string
          request_offer_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_request_offer_id_fkey"
            columns: ["request_offer_id"]
            isOneToOne: true
            referencedRelation: "request_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          region?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      request_offers: {
        Row: {
          available_date: string | null
          created_at: string
          farmer_id: string
          id: string
          listing_id: string | null
          message: string | null
          price_per_unit: number
          quantity: number
          request_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          available_date?: string | null
          created_at?: string
          farmer_id: string
          id?: string
          listing_id?: string | null
          message?: string | null
          price_per_unit: number
          quantity: number
          request_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          available_date?: string | null
          created_at?: string
          farmer_id?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          price_per_unit?: number
          quantity?: number
          request_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_offers_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "request_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "buying_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_suppliers: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_suppliers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "saved_suppliers_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      verification_submissions: {
        Row: {
          created_at: string
          document_paths: string[]
          farm_id: string | null
          id: string
          notes: string | null
          profile_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["submission_status"]
          type: Database["public"]["Enums"]["verification_submission_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_paths?: string[]
          farm_id?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          type: Database["public"]["Enums"]["verification_submission_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_paths?: string[]
          farm_id?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          type?: Database["public"]["Enums"]["verification_submission_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_submissions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_buyer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_buyer_profiles: {
        Row: {
          business_name: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          city: string | null
          full_name: string | null
          id: string | null
          region: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      public_farmer_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          region: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_farming: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_offer_and_create_order: {
        Args: { p_offer_id: string }
        Returns: Json
      }
      accept_request_offer_and_create_order: {
        Args: { p_request_offer_id: string }
        Returns: Json
      }
      admin_review_verification_submission: {
        Args: {
          p_review_notes?: string
          p_status: Database["public"]["Enums"]["submission_status"]
          p_submission_id: string
        }
        Returns: {
          created_at: string
          document_paths: string[]
          farm_id: string | null
          id: string
          notes: string | null
          profile_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["submission_status"]
          type: Database["public"]["Enums"]["verification_submission_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "verification_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      create_buy_now_order: {
        Args: {
          p_delivery_address?: string
          p_delivery_method?: Database["public"]["Enums"]["delivery_method"]
          p_listing_id: string
          p_notes?: string
          p_quantity: number
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_trusted_backend: { Args: never; Returns: boolean }
      order_transition_allowed: {
        Args: {
          from_status: Database["public"]["Enums"]["order_status"]
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: boolean
      }
      remove_farmer_listing: { Args: { p_listing_id: string }; Returns: Json }
      update_farmer_listing: {
        Args: {
          p_available_date?: string
          p_category_id?: string
          p_city?: string
          p_crop_name?: string
          p_delivery_available?: boolean
          p_description?: string
          p_expected_version?: number
          p_farm_id?: string
          p_grade?: Database["public"]["Enums"]["produce_grade"]
          p_harvest_date?: string
          p_listing_id: string
          p_price_per_unit?: number
          p_quantity_available?: number
          p_region?: string
          p_status?: Database["public"]["Enums"]["listing_status"]
          p_unit?: Database["public"]["Enums"]["produce_unit"]
          p_variety?: string
        }
        Returns: {
          available_date: string | null
          category_id: string
          city: string | null
          created_at: string
          crop_name: string
          currency: string
          delivery_available: boolean
          description: string | null
          farm_id: string | null
          farmer_id: string
          grade: Database["public"]["Enums"]["produce_grade"]
          harvest_date: string | null
          id: string
          price_per_unit: number
          quantity_available: number
          region: string
          search: unknown
          status: Database["public"]["Enums"]["listing_status"]
          unit: Database["public"]["Enums"]["produce_unit"]
          updated_at: string
          variety: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      business_type:
        | "INDIVIDUAL"
        | "RETAILER"
        | "WHOLESALER"
        | "RESTAURANT"
        | "PROCESSOR"
        | "EXPORTER"
        | "OTHER"
      delivery_method: "PICKUP" | "DELIVERY"
      dispute_status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED"
      listing_status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT" | "REMOVED"
      notification_type:
        | "NEW_OFFER"
        | "OFFER_ACCEPTED"
        | "OFFER_REJECTED"
        | "NEW_ORDER"
        | "ORDER_ACCEPTED"
        | "ORDER_STATUS_CHANGED"
        | "NEW_BUYING_REQUEST"
        | "FARMER_RESPONSE"
      offer_status:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "WITHDRAWN"
        | "EXPIRED"
      order_source: "BUY_NOW" | "OFFER" | "REQUEST"
      order_status:
        | "PENDING"
        | "ACCEPTED"
        | "CONFIRMED"
        | "PREPARING"
        | "READY_FOR_PICKUP"
        | "IN_TRANSIT"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
        | "DISPUTED"
        | "REJECTED"
      produce_grade: "A" | "B" | "C" | "UNGRADED"
      produce_unit: "KG" | "TONNE" | "BAG" | "CRATE" | "BOX" | "BUNCH" | "PIECE"
      request_status: "OPEN" | "FULFILLED" | "CLOSED" | "CANCELLED"
      submission_status: "PENDING" | "APPROVED" | "REJECTED"
      user_role: "FARMER" | "BUYER" | "ADMIN"
      verification_status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED"
      verification_submission_type: "FARMER_IDENTITY" | "FARM" | "BUSINESS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_type: [
        "INDIVIDUAL",
        "RETAILER",
        "WHOLESALER",
        "RESTAURANT",
        "PROCESSOR",
        "EXPORTER",
        "OTHER",
      ],
      delivery_method: ["PICKUP", "DELIVERY"],
      dispute_status: ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"],
      listing_status: ["DRAFT", "ACTIVE", "PAUSED", "SOLD_OUT", "REMOVED"],
      notification_type: [
        "NEW_OFFER",
        "OFFER_ACCEPTED",
        "OFFER_REJECTED",
        "NEW_ORDER",
        "ORDER_ACCEPTED",
        "ORDER_STATUS_CHANGED",
        "NEW_BUYING_REQUEST",
        "FARMER_RESPONSE",
      ],
      offer_status: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"],
      order_source: ["BUY_NOW", "OFFER", "REQUEST"],
      order_status: [
        "PENDING",
        "ACCEPTED",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "IN_TRANSIT",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
        "REJECTED",
      ],
      produce_grade: ["A", "B", "C", "UNGRADED"],
      produce_unit: ["KG", "TONNE", "BAG", "CRATE", "BOX", "BUNCH", "PIECE"],
      request_status: ["OPEN", "FULFILLED", "CLOSED", "CANCELLED"],
      submission_status: ["PENDING", "APPROVED", "REJECTED"],
      user_role: ["FARMER", "BUYER", "ADMIN"],
      verification_status: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
      verification_submission_type: ["FARMER_IDENTITY", "FARM", "BUSINESS"],
    },
  },
} as const
