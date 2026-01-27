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
      };
      reservation_logs: {
        Row: {
          id: string;
          procedure_id: string;
          office_name: string;
          booked_at: string;
          source: string;
        };
        Insert: {
          id?: string;
          procedure_id: string;
          office_name: string;
          booked_at?: string;
          source?: string;
        };
        Update: {
          id?: string;
          procedure_id?: string;
          office_name?: string;
          booked_at?: string;
          source?: string;
        };
      };
      carousel_images: {
        Row: {
          id: string;
          storage_path: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          storage_path?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

export type Procedure = Database["public"]["Tables"]["procedures"]["Row"];
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
export type ReservationLog = Database["public"]["Tables"]["reservation_logs"]["Row"];
export type ReservationLogInsert = Database["public"]["Tables"]["reservation_logs"]["Insert"];
export type CarouselImage = Database["public"]["Tables"]["carousel_images"]["Row"];
export type CarouselImageInsert = Database["public"]["Tables"]["carousel_images"]["Insert"];
