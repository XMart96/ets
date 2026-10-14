// Generated from the Supabase project (generate_typescript_types), helper
// types trimmed. Regenerate after schema changes. Note: the generator types
// nullable RPC columns (e.g. ended_at) as non-null, the api/ layer overrides them.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      clinics: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string | null;
          first_name: string;
          id: string;
          last_name: string;
          role: string;
        };
        Insert: {
          created_at?: string | null;
          first_name: string;
          id: string;
          last_name: string;
          role?: string;
        };
        Update: {
          created_at?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          role?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          clinic_id: string;
          created_at: string;
          ended_at: string | null;
          id: string;
          started_at: string;
          user_id: string;
        };
        Insert: {
          clinic_id: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id?: string;
        };
        Update: {
          clinic_id?: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      day_overview: {
        Args: { p_day?: string };
        Returns: {
          clinic_name: string;
          day_end: string;
          day_start: string;
          ended_at: string;
          entry_id: string;
          first_name: string;
          last_name: string;
          server_now: string;
          started_at: string;
          user_id: string;
        }[];
      };
      get_active_timer: {
        Args: never;
        Returns: {
          clinic_id: string;
          entry_id: string;
          server_now: string;
          started_at: string;
        }[];
      };
      is_root: { Args: never; Returns: boolean };
      period_entries: {
        Args: { p_from: string; p_to: string; p_user_id: string };
        Returns: {
          clinic_name: string;
          ended_at: string;
          entry_id: string;
          server_now: string;
          started_at: string;
        }[];
      };
      period_report: {
        Args: { p_from: string; p_to: string };
        Returns: {
          entries_count: number;
          first_name: string;
          has_active: boolean;
          last_name: string;
          total_seconds: number;
          user_id: string;
        }[];
      };
      start_timer: {
        Args: { p_clinic_id: string };
        Returns: {
          entry_id: string;
          server_now: string;
          started_at: string;
        }[];
      };
      stop_timer: {
        Args: never;
        Returns: {
          ended_at: string;
          entry_id: string;
          started_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
