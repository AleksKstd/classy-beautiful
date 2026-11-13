export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

export type Database = {
  public: {
    Tables: {
      procedures: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price: number;
          is_active: boolean;
          discount_percentage: number | null;
          type: string;
          technician: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price: number;
          is_active?: boolean;
          discount_percentage?: number | null;
          type: string;
          technician: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price?: number;
          is_active?: boolean;
          discount_percentage?: number | null;
          type?: string;
          technician?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          office_name: string;
          closed_date_start: string;
          closed_date_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          office_name: string;
          closed_date_start: string;
          closed_date_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          office_name?: string;
          closed_date_start?: string;
          closed_date_end?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reservation_logs: {
        Row: {
          id: string;
          procedure_id: string;
          office_name: string;
          booked_at: string;
          source: string;
          reservation_id: string | null;
        };
        Insert: {
          id?: string;
          procedure_id: string;
          office_name: string;
          booked_at?: string;
          source?: string;
          reservation_id?: string | null;
        };
        Update: {
          id?: string;
          procedure_id?: string;
          office_name?: string;
          booked_at?: string;
          source?: string;
          reservation_id?: string | null;
        };
        Relationships: [];
      };
      carousel_images: {
        Row: {
          id: string;
          storage_path: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          procedure_id: string | null;
          caption: string | null;
        };
        Insert: {
          id?: string;
          storage_path: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          procedure_id?: string | null;
          caption?: string | null;
        };
        Update: {
          id?: string;
          storage_path?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          procedure_id?: string | null;
          caption?: string | null;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          procedure_id: string;
          office_name: string;
          start_at: string;
          end_at: string;
          customer_first_name: string;
          customer_last_name: string;
          customer_phone: string;
          customer_email: string;
          customer_note: string | null;
          status: ReservationStatus;
          original_start_at: string | null;
          rescheduled_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          confirmed_at: string | null;
          confirmation_email_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          procedure_id: string;
          office_name: string;
          start_at: string;
          end_at: string;
          customer_first_name: string;
          customer_last_name: string;
          customer_phone: string;
          customer_email: string;
          customer_note?: string | null;
          status?: ReservationStatus;
          original_start_at?: string | null;
          rescheduled_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          confirmed_at?: string | null;
          confirmation_email_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          procedure_id?: string;
          office_name?: string;
          start_at?: string;
          end_at?: string;
          customer_first_name?: string;
          customer_last_name?: string;
          customer_phone?: string;
          customer_email?: string;
          customer_note?: string | null;
          status?: ReservationStatus;
          original_start_at?: string | null;
          rescheduled_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          confirmed_at?: string | null;
          confirmation_email_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
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

export type Procedure = Database["public"]["Tables"]["procedures"]["Row"];
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
export type ReservationLog = Database["public"]["Tables"]["reservation_logs"]["Row"];
export type ReservationLogInsert = Database["public"]["Tables"]["reservation_logs"]["Insert"];
export type CarouselImage = Database["public"]["Tables"]["carousel_images"]["Row"];
export type CarouselImageInsert = Database["public"]["Tables"]["carousel_images"]["Insert"];

// Reservation types
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
export type ReservationUpdate = Database["public"]["Tables"]["reservations"]["Update"];

// Admin settings types
export type AdminSetting = Database["public"]["Tables"]["admin_settings"]["Row"];

// Extended reservation with procedure info for display
export type ReservationWithProcedure = Reservation & {
  procedure: Procedure;
};
