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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          endpoint: string
          fetched_at: string
          payload: Json
          ttl_seconds: number
        }
        Insert: {
          cache_key: string
          endpoint: string
          fetched_at?: string
          payload: Json
          ttl_seconds?: number
        }
        Update: {
          cache_key?: string
          endpoint?: string
          fetched_at?: string
          payload?: Json
          ttl_seconds?: number
        }
        Relationships: []
      }
      api_quota: {
        Row: {
          checked_at: string
          provider: string
          rate_limit: number | null
          remaining: number | null
        }
        Insert: {
          checked_at?: string
          provider: string
          rate_limit?: number | null
          remaining?: number | null
        }
        Update: {
          checked_at?: string
          provider?: string
          rate_limit?: number | null
          remaining?: number | null
        }
        Relationships: []
      }
      ask_conversations: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ask_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ask_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          category: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: number
          is_active: boolean
          name: string
          opens_at: string | null
          organizer: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          name: string
          opens_at?: string | null
          organizer?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          name?: string
          opens_at?: string | null
          organizer?: string | null
          url?: string
        }
        Relationships: []
      }
      diagnostics_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          feed: string
          id: number
          ok: boolean
          source: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          feed: string
          id?: never
          ok: boolean
          source?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          feed?: string
          id?: never
          ok?: boolean
          source?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          id: number
          message: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: never
          message: string
          name?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: never
          message?: string
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_list: {
        Row: {
          added_at: string
          book_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shared_lists: {
        Row: {
          created_at: string
          include_notes: boolean
          is_public: boolean
          share_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          include_notes?: boolean
          is_public?: boolean
          share_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          include_notes?: boolean
          is_public?: boolean
          share_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_error_events: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          message: string
          path: string | null
          resolved: boolean
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          message: string
          path?: string | null
          resolved?: boolean
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          message?: string
          path?: string | null
          resolved?: boolean
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_suggestions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      space_news: {
        Row: {
          content_type: string
          fetched_at: string
          id: number
          image_url: string | null
          news_site: string | null
          published_at: string | null
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          content_type: string
          fetched_at?: string
          id: number
          image_url?: string | null
          news_site?: string | null
          published_at?: string | null
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          content_type?: string
          fetched_at?: string
          id?: number
          image_url?: string | null
          news_site?: string | null
          published_at?: string | null
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      tracker_favorites: {
        Row: {
          added_at: string
          name: string
          norad_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          name: string
          norad_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          name?: string
          norad_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          observer_lat: number | null
          observer_lon: number | null
          observer_source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          observer_lat?: number | null
          observer_lon?: number | null
          observer_source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          observer_lat?: number | null
          observer_lon?: number | null
          observer_source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_list_meta: {
        Args: { _share_id: string }
        Returns: {
          book_count: number
          include_notes: boolean
          title: string
        }[]
      }
      get_shared_reading_list: {
        Args: { _share_id: string }
        Returns: {
          added_at: string
          book_id: string
          note: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_refresh_token: { Args: { _t: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
