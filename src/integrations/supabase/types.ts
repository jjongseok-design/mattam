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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_hint: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_hint?: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_hint?: string
          success?: boolean
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          id_prefix: string
          label: string
          sort_order: number
          tag_placeholder: string | null
          tag_suggestions: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id: string
          id_prefix?: string
          label: string
          sort_order?: number
          tag_placeholder?: string | null
          tag_suggestions?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          id_prefix?: string
          label?: string
          sort_order?: number
          tag_placeholder?: string | null
          tag_suggestions?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      device_favorites: {
        Row: {
          device_id: string
          favorited_at: string
          restaurant_id: string
        }
        Insert: {
          device_id: string
          favorited_at?: string
          restaurant_id: string
        }
        Update: {
          device_id?: string
          favorited_at?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_favorites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_visits: {
        Row: {
          device_id: string
          id: string
          is_first_visit: boolean
          restaurant_id: string
          visited_at: string
        }
        Insert: {
          device_id: string
          id?: string
          is_first_visit?: boolean
          restaurant_id: string
          visited_at?: string
        }
        Update: {
          device_id?: string
          id?: string
          is_first_visit?: boolean
          restaurant_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_visits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_id: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_id: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string
          category: string
          closed_days: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          lat: number
          lng: number
          name: string
          opening_hours: string | null
          phone: string | null
          price_range: string | null
          rating: number
          review_count: number
          slug: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address: string
          category?: string
          closed_days?: string | null
          created_at?: string
          description?: string | null
          id: string
          image_url?: string | null
          lat: number
          lng: number
          name: string
          opening_hours?: string | null
          phone?: string | null
          price_range?: string | null
          rating?: number
          review_count?: number
          slug?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          closed_days?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          name?: string
          opening_hours?: string | null
          phone?: string | null
          price_range?: string | null
          rating?: number
          review_count?: number
          slug?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      review_images: {
        Row: {
          created_at: string
          id: string
          position: number
          review_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          review_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          review_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          device_id: string
          liked_at: string
          review_id: string
        }
        Insert: {
          device_id: string
          liked_at?: string
          review_id: string
        }
        Update: {
          device_id?: string
          liked_at?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          likes_count: number
          nickname: string | null
          rating: number
          restaurant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          nickname?: string | null
          rating: number
          restaurant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          nickname?: string | null
          rating?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          address: string | null
          category: string
          created_at: string
          id: string
          reason: string | null
          restaurant_name: string
          status: string
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_name: string
          status?: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_name?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
