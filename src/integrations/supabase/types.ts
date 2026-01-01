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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_results: {
        Row: {
          created_at: string | null
          credits_spent: number | null
          diamonds_won: number | null
          game_name: string
          id: string
          multiplier: number | null
          result: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_spent?: number | null
          diamonds_won?: number | null
          game_name: string
          id?: string
          multiplier?: number | null
          result: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_spent?: number | null
          diamonds_won?: number | null
          game_name?: string
          id?: string
          multiplier?: number | null
          result?: string
          user_id?: string
        }
        Relationships: []
      }
      game_room_players: {
        Row: {
          bet_amount: number | null
          cashed_out_at: number | null
          id: string
          is_active: boolean | null
          joined_at: string
          room_id: string
          user_id: string
          username: string | null
          winnings: number | null
        }
        Insert: {
          bet_amount?: number | null
          cashed_out_at?: number | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          room_id: string
          user_id: string
          username?: string | null
          winnings?: number | null
        }
        Update: {
          bet_amount?: number | null
          cashed_out_at?: number | null
          id?: string
          is_active?: boolean | null
          joined_at?: string
          room_id?: string
          user_id?: string
          username?: string | null
          winnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          ended_at: string | null
          game_type: string
          id: string
          max_players: number | null
          round_data: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          game_type: string
          id?: string
          max_players?: number | null
          round_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          game_type?: string
          id?: string
          max_players?: number | null
          round_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      maze_leaderboard: {
        Row: {
          completion_time_ms: number
          created_at: string
          id: string
          user_id: string
          username: string | null
          wallet_name: string | null
        }
        Insert: {
          completion_time_ms: number
          created_at?: string
          id?: string
          user_id: string
          username?: string | null
          wallet_name?: string | null
        }
        Update: {
          completion_time_ms?: number
          created_at?: string
          id?: string
          user_id?: string
          username?: string | null
          wallet_name?: string | null
        }
        Relationships: []
      }
      maze_tournaments: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          max_players: number
          name: string
          prize_pool: number
          round_number: number
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          name: string
          prize_pool?: number
          round_number?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          name?: string
          prize_pool?: number
          round_number?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      player_emotes: {
        Row: {
          created_at: string
          emote: string
          expires_at: string
          id: string
          user_id: string
          username: string | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          emote: string
          expires_at?: string
          id?: string
          user_id: string
          username?: string | null
          x: number
          y: number
        }
        Update: {
          created_at?: string
          emote?: string
          expires_at?: string
          id?: string
          user_id?: string
          username?: string | null
          x?: number
          y?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string | null
          wallet_address: string | null
          wallet_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          connected_at?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
          wallet_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          wallet_address?: string | null
          wallet_name?: string | null
        }
        Relationships: []
      }
      tournament_players: {
        Row: {
          completion_time_ms: number | null
          id: string
          joined_at: string
          round_eliminated: number | null
          status: string
          tournament_id: string
          user_id: string
          username: string | null
        }
        Insert: {
          completion_time_ms?: number | null
          id?: string
          joined_at?: string
          round_eliminated?: number | null
          status?: string
          tournament_id: string
          user_id: string
          username?: string | null
        }
        Update: {
          completion_time_ms?: number | null
          id?: string
          joined_at?: string
          round_eliminated?: number | null
          status?: string
          tournament_id?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "maze_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_colors: {
        Row: {
          active: boolean
          color_name: string
          color_value: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          color_name: string
          color_value: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          color_name?: string
          color_value?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          total_purchased: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_purchased?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_purchased?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_diamonds: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_keys: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_nft_bonuses: {
        Row: {
          bulls_owned: number
          created_at: string
          highest_rarity: string | null
          id: string
          last_scanned_at: string
          rarity_bonus: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bulls_owned?: number
          created_at?: string
          highest_rarity?: string | null
          id?: string
          last_scanned_at?: string
          rarity_bonus?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bulls_owned?: number
          created_at?: string
          highest_rarity?: string | null
          id?: string
          last_scanned_at?: string
          rarity_bonus?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      world_chat: {
        Row: {
          created_at: string
          id: string
          is_emote: boolean
          message: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_emote?: boolean
          message: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_emote?: boolean
          message?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      world_diamonds: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          created_at: string
          expires_at: string
          id: string
          value: number
          x: number
          y: number
        }
        Insert: {
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          value?: number
          x: number
          y: number
        }
        Update: {
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          value?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      world_players: {
        Row: {
          color: string
          created_at: string
          direction: string
          id: string
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
          username: string | null
          x: number
          y: number
        }
        Insert: {
          color?: string
          created_at?: string
          direction?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
          username?: string | null
          x?: number
          y?: number
        }
        Update: {
          color?: string
          created_at?: string
          direction?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          x?: number
          y?: number
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          rank: number | null
          total_diamonds: number | null
          total_games: number | null
          total_wins: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_chat_messages: { Args: never; Returns: undefined }
      handle_wallet_auth: {
        Args: {
          _nickname?: string
          _wallet_address: string
          _wallet_name: string
        }
        Returns: string
      }
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
