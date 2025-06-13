export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_memory: {
        Row: {
          content: Json
          created_at: string | null
          embedding: string | null
          id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string | null
          embedding?: string | null
          id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          embedding?: string | null
          id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          timestamp: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          applied_at: string | null
          error_message: string | null
          execution_time: number | null
          hash: string
          id: number
          name: string
          success: boolean
        }
        Insert: {
          applied_at?: string | null
          error_message?: string | null
          execution_time?: number | null
          hash: string
          id?: number
          name: string
          success: boolean
        }
        Update: {
          applied_at?: string | null
          error_message?: string | null
          execution_time?: number | null
          hash?: string
          id?: number
          name?: string
          success?: boolean
        }
        Relationships: []
      }
      user_check_ins: {
        Row: {
          body_fat_percentage: number | null
          created_at: string | null
          date: string
          energy_level: number | null
          id: string
          measurements: Json | null
          mood: string | null
          notes: string | null
          sleep_quality: string | null
          stress_level: number | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string | null
          date: string
          energy_level?: number | null
          id?: string
          measurements?: Json | null
          mood?: string | null
          notes?: string | null
          sleep_quality?: string | null
          stress_level?: number | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string | null
          date?: string
          energy_level?: number | null
          id?: string
          measurements?: Json | null
          mood?: string | null
          notes?: string | null
          sleep_quality?: string | null
          stress_level?: number | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string | null
          equipment: string[] | null
          experience_level: string | null
          fitness_goals: string[] | null
          gender: string | null
          height: number | null
          id: string
          medical_conditions: Json | null
          name: string | null
          unit_preference: string | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_conditions?: Json | null
          name?: string | null
          unit_preference?: string | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          equipment?: string[] | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_conditions?: Json | null
          name?: string | null
          unit_preference?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          energy_level: number | null
          exercises_completed: Json
          feedback: string | null
          id: string
          overall_difficulty: number | null
          plan_id: string | null
          satisfaction: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          energy_level?: number | null
          exercises_completed?: Json
          feedback?: string | null
          id?: string
          overall_difficulty?: number | null
          plan_id?: string | null
          satisfaction?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          energy_level?: number | null
          exercises_completed?: Json
          feedback?: string | null
          id?: string
          overall_difficulty?: number | null
          plan_id?: string | null
          satisfaction?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          ai_generated: boolean | null
          ai_reasoning: Json | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          equipment_required: string[] | null
          estimated_duration: number | null
          goals: string[] | null
          id: string
          name: string
          plan_data: Json
          schedule_frequency: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reasoning?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_required?: string[] | null
          estimated_duration?: number | null
          goals?: string[] | null
          id?: string
          name: string
          plan_data?: Json
          schedule_frequency?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_reasoning?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_required?: string[] | null
          estimated_duration?: number | null
          goals?: string[] | null
          id?: string
          name?: string
          plan_data?: Json
          schedule_frequency?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
