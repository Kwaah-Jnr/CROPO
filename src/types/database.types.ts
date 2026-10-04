export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          phone: string | null;
          region: string | null;
          city: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          phone?: string | null;
          region?: string | null;
          city?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string;
          phone?: string | null;
          region?: string | null;
          city?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      farmer_profiles: {
        Row: {
          profile_id: string;
          bio: string | null;
          years_farming: number | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          bio?: string | null;
          years_farming?: number | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          bio?: string | null;
          years_farming?: number | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "farmer_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "farmer_profiles_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_profiles: {
        Row: {
          profile_id: string;
          business_name: string | null;
          business_type: Database["public"]["Enums"]["business_type"];
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          business_name?: string | null;
          business_type?: Database["public"]["Enums"]["business_type"];
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          business_name?: string | null;
          business_type?: Database["public"]["Enums"]["business_type"];
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_profiles_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      farms: {
        Row: {
          id: string;
          farmer_id: string;
          name: string;
          region: string;
          district: string | null;
          community: string | null;
          size_hectares: number | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          name: string;
          region: string;
          district?: string | null;
          community?: string | null;
          size_hectares?: number | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          name?: string;
          region?: string;
          district?: string | null;
          community?: string | null;
          size_hectares?: number | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "farms_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "farmer_profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      crop_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          farmer_id: string;
          farm_id: string | null;
          category_id: string;
          crop_name: string;
          variety: string | null;
          quantity_available: number;
          unit: Database["public"]["Enums"]["produce_unit"];
          price_per_unit: number;
          currency: string;
          grade: Database["public"]["Enums"]["produce_grade"];
          harvest_date: string | null;
          available_date: string | null;
          region: string;
          city: string | null;
          description: string | null;
          delivery_available: boolean;
          status: Database["public"]["Enums"]["listing_status"];
          search: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          farm_id?: string | null;
          category_id: string;
          crop_name: string;
          variety?: string | null;
          quantity_available: number;
          unit: Database["public"]["Enums"]["produce_unit"];
          price_per_unit: number;
          currency?: string;
          grade?: Database["public"]["Enums"]["produce_grade"];
          harvest_date?: string | null;
          available_date?: string | null;
          region: string;
          city?: string | null;
          description?: string | null;
          delivery_available?: boolean;
          status?: Database["public"]["Enums"]["listing_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          farm_id?: string | null;
          category_id?: string;
          crop_name?: string;
          variety?: string | null;
          quantity_available?: number;
          unit?: Database["public"]["Enums"]["produce_unit"];
          price_per_unit?: number;
          currency?: string;
          grade?: Database["public"]["Enums"]["produce_grade"];
          harvest_date?: string | null;
          available_date?: string | null;
          region?: string;
          city?: string | null;
          description?: string | null;
          delivery_available?: boolean;
          status?: Database["public"]["Enums"]["listing_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "farmer_profiles";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "listings_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "crop_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          sort_order: number;
          alt_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          sort_order?: number;
          alt_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          storage_path?: string;
          sort_order?: number;
          alt_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          farmer_id: string;
          quantity: number;
          price_per_unit: number;
          message: string | null;
          status: Database["public"]["Enums"]["offer_status"];
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          farmer_id: string;
          quantity: number;
          price_per_unit: number;
          message?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          farmer_id?: string;
          quantity?: number;
          price_per_unit?: number;
          message?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      buying_requests: {
        Row: {
          id: string;
          buyer_id: string;
          category_id: string | null;
          crop_name: string;
          quantity: number;
          unit: Database["public"]["Enums"]["produce_unit"];
          desired_grade: Database["public"]["Enums"]["produce_grade"] | null;
          destination_region: string;
          destination_city: string | null;
          required_by: string | null;
          target_price_per_unit: number | null;
          currency: string;
          description: string | null;
          status: Database["public"]["Enums"]["request_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          category_id?: string | null;
          crop_name: string;
          quantity: number;
          unit: Database["public"]["Enums"]["produce_unit"];
          desired_grade?: Database["public"]["Enums"]["produce_grade"] | null;
          destination_region: string;
          destination_city?: string | null;
          required_by?: string | null;
          target_price_per_unit?: number | null;
          currency?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          category_id?: string | null;
          crop_name?: string;
          quantity?: number;
          unit?: Database["public"]["Enums"]["produce_unit"];
          desired_grade?: Database["public"]["Enums"]["produce_grade"] | null;
          destination_region?: string;
          destination_city?: string | null;
          required_by?: string | null;
          target_price_per_unit?: number | null;
          currency?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      request_offers: {
        Row: {
          id: string;
          request_id: string;
          farmer_id: string;
          listing_id: string | null;
          quantity: number;
          price_per_unit: number;
          available_date: string | null;
          message: string | null;
          status: Database["public"]["Enums"]["offer_status"];
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          farmer_id: string;
          listing_id?: string | null;
          quantity: number;
          price_per_unit: number;
          available_date?: string | null;
          message?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          farmer_id?: string;
          listing_id?: string | null;
          quantity?: number;
          price_per_unit?: number;
          available_date?: string | null;
          message?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          buyer_id: string;
          farmer_id: string;
          source: Database["public"]["Enums"]["order_source"];
          offer_id: string | null;
          request_offer_id: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          currency: string;
          delivery_method: Database["public"]["Enums"]["delivery_method"];
          delivery_address: string | null;
          notes: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          buyer_id: string;
          farmer_id: string;
          source: Database["public"]["Enums"]["order_source"];
          offer_id?: string | null;
          request_offer_id?: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          currency?: string;
          delivery_method?: Database["public"]["Enums"]["delivery_method"];
          delivery_address?: string | null;
          notes?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          buyer_id?: string;
          farmer_id?: string;
          source?: Database["public"]["Enums"]["order_source"];
          offer_id?: string | null;
          request_offer_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          currency?: string;
          delivery_method?: Database["public"]["Enums"]["delivery_method"];
          delivery_address?: string | null;
          notes?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          listing_id: string | null;
          crop_name: string;
          unit: Database["public"]["Enums"]["produce_unit"];
          quantity: number;
          price_per_unit: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          listing_id?: string | null;
          crop_name: string;
          unit: Database["public"]["Enums"]["produce_unit"];
          quantity: number;
          price_per_unit: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          listing_id?: string | null;
          crop_name?: string;
          unit?: Database["public"]["Enums"]["produce_unit"];
          quantity?: number;
          price_per_unit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          changed_by: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status?: Database["public"]["Enums"]["order_status"];
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          title?: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_suppliers: {
        Row: {
          id: string;
          buyer_id: string;
          farmer_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          farmer_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          farmer_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      verification_submissions: {
        Row: {
          id: string;
          profile_id: string;
          farm_id: string | null;
          type: Database["public"]["Enums"]["verification_submission_type"];
          document_paths: string[];
          notes: string | null;
          status: Database["public"]["Enums"]["submission_status"];
          reviewer_id: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          farm_id?: string | null;
          type: Database["public"]["Enums"]["verification_submission_type"];
          document_paths?: string[];
          notes?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          farm_id?: string | null;
          type?: Database["public"]["Enums"]["verification_submission_type"];
          document_paths?: string[];
          notes?: string | null;
          status?: Database["public"]["Enums"]["submission_status"];
          reviewer_id?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          opened_by: string;
          reason: string;
          status: Database["public"]["Enums"]["dispute_status"];
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          opened_by: string;
          reason: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          opened_by?: string;
          reason?: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_farmer_profiles: {
        Row: {
          id: string;
          full_name: string;
          region: string | null;
          city: string | null;
          avatar_path: string | null;
          bio: string | null;
          years_farming: number | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          created_at: string;
        };
      };
      public_buyer_profiles: {
        Row: {
          id: string;
          full_name: string;
          region: string | null;
          city: string | null;
          business_name: string | null;
          business_type: Database["public"]["Enums"]["business_type"];
          verification_status: Database["public"]["Enums"]["verification_status"];
        };
      };
    };
    Functions: {
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      order_transition_allowed: {
        Args: {
          from_status: Database["public"]["Enums"]["order_status"];
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "FARMER" | "BUYER" | "ADMIN";
      verification_status: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
      business_type:
        | "INDIVIDUAL"
        | "RETAILER"
        | "WHOLESALER"
        | "RESTAURANT"
        | "PROCESSOR"
        | "EXPORTER"
        | "OTHER";
      listing_status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT" | "REMOVED";
      produce_unit: "KG" | "TONNE" | "BAG" | "CRATE" | "BOX" | "BUNCH" | "PIECE";
      produce_grade: "A" | "B" | "C" | "UNGRADED";
      offer_status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
      request_status: "OPEN" | "FULFILLED" | "CLOSED" | "CANCELLED";
      order_source: "BUY_NOW" | "OFFER" | "REQUEST";
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
        | "REJECTED";
      delivery_method: "PICKUP" | "DELIVERY";
      notification_type:
        | "NEW_OFFER"
        | "OFFER_ACCEPTED"
        | "OFFER_REJECTED"
        | "NEW_ORDER"
        | "ORDER_ACCEPTED"
        | "ORDER_STATUS_CHANGED"
        | "NEW_BUYING_REQUEST"
        | "FARMER_RESPONSE";
      verification_submission_type: "FARMER_IDENTITY" | "FARM" | "BUSINESS";
      submission_status: "PENDING" | "APPROVED" | "REJECTED";
      dispute_status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
