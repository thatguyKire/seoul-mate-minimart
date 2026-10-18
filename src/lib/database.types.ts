// Types for the tables the browser reads, in the shape `supabase gen types` produces.
// Written by hand from supabase/migrations while no Supabase stack runs on the development
// PC; keep in step with the migrations (docs/BACKEND-SCHEMA.md section 2). Visitors can
// select only some item columns, so `items.Row` lists the columns the public site uses.

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
        Insert: never;
        Update: never;
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
          is_available: boolean;
          is_sample: boolean;
          sort_order: number;
          availability_changed_at: string;
        };
        Insert: never;
        Update: never;
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
    // The client expects these groups even when they are empty, as in generated types.
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type
    Views: Record<never, never>;
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type
    Functions: Record<never, never>;
  };
}
