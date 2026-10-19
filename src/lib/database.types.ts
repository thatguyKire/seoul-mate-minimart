// Types for the tables and functions the browser uses, in the shape `supabase gen types`
// produces. Written by hand from supabase/migrations while no Supabase stack runs on the
// development PC; keep in step with the migrations (docs/BACKEND-SCHEMA.md sections 2 and 4).
// Rows list every column; visitors may select only some item columns (see
// src/features/catalog/types.ts).

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name_en: string;
          name_fil: string | null;
          name_ko: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name_en: string;
          name_fil?: string | null;
          name_ko?: string | null;
          sort_order?: number;
        };
        Update: {
          slug?: string;
          name_en?: string;
          name_fil?: string | null;
          name_ko?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          category_id: string;
          name_en: string;
          name_fil: string | null;
          name_ko: string | null;
          description_en: string;
          description_fil: string | null;
          description_ko: string | null;
          price_centavos: number;
          photo_path: string | null;
          photo_format: 'webp' | 'jpg' | null;
          is_published: boolean;
          is_available: boolean;
          is_sample: boolean;
          sort_order: number;
          availability_changed_at: string;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          name_en: string;
          name_fil?: string | null;
          name_ko?: string | null;
          description_en?: string;
          description_fil?: string | null;
          description_ko?: string | null;
          price_centavos: number;
          photo_path?: string | null;
          photo_format?: 'webp' | 'jpg' | null;
          is_published?: boolean;
          is_available?: boolean;
          sort_order?: number;
        };
        Update: {
          category_id?: string;
          name_en?: string;
          name_fil?: string | null;
          name_ko?: string | null;
          description_en?: string;
          description_fil?: string | null;
          description_ko?: string | null;
          price_centavos?: number;
          photo_path?: string | null;
          photo_format?: 'webp' | 'jpg' | null;
          is_published?: boolean;
          is_available?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      admins: {
        Row: {
          user_id: string;
          require_mfa: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      menu_state: {
        Row: {
          id: number;
          version: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    // The client expects this group even when it is empty, as in generated types.
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      reorder_categories: { Args: { p_ids: string[] }; Returns: undefined };
      reorder_items: { Args: { p_category_id: string; p_ids: string[] }; Returns: undefined };
    };
  };
}
