/**
 * Hand-written shape until we run `supabase gen types typescript`.
 * Mirrors the schema in CLAUDE.md / migrations.
 */

export type ProductSize = "S" | "M" | "L";
export type ProductMaterial =
  | "matte-vinyl"
  | "glossy-vinyl"
  | "fabric-texture"
  | "magnetic-base";
export type Category = "abstract" | "botanical" | "geometric" | "mural" | "kids" | "minimal";
export type OrderStatus =
  | "created"
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type Role = "user" | "admin";

export type Profile = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  role: Role;
  created_at: string;
};

export type ProductDimensions = Partial<Record<ProductSize, { w_cm: number; h_cm: number }>>;
export type MaterialPriceModifier = Partial<Record<ProductMaterial, number>>;

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  base_price: number;
  images: string[];
  available_sizes: ProductSize[];
  available_materials: ProductMaterial[];
  material_price_modifier: MaterialPriceModifier;
  dimensions: ProductDimensions;
  tags: string[];
  stock: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
};

export type SavedPreview = {
  id: string;
  user_id: string;
  product_id: string;
  wall_image_url: string;
  composited_image_url: string;
  created_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  size: ProductSize;
  material: ProductMaterial;
  quantity: number;
  created_at: string;
};

export type Favorite = {
  user_id: string;
  product_id: string;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  created_at: string;
};

export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
};

export type OrderLineItem = {
  product_id: string;
  slug: string;
  name: string;
  size: ProductSize;
  material: ProductMaterial;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  user_id: string;
  items: OrderLineItem[];
  total: number;
  address: Address;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

/* --- Supabase generated-style envelope so the client typings work --- */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at"> & { id?: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      saved_previews: {
        Row: SavedPreview;
        Insert: Omit<SavedPreview, "id" | "created_at"> & { id?: string };
        Update: Partial<SavedPreview>;
        Relationships: [];
      };
      cart_items: {
        Row: CartItem;
        Insert: Omit<CartItem, "id" | "created_at"> & { id?: string };
        Update: Partial<CartItem>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Omit<Favorite, "created_at"> & { created_at?: string };
        Update: Partial<Favorite>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, "id" | "created_at" | "verified_purchase"> & {
          id?: string;
          verified_purchase?: boolean;
        };
        Update: Partial<Review>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at"> & { id?: string };
        Update: Partial<Order>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      product_size: ProductSize;
      product_material: ProductMaterial;
      category: Category;
      order_status: OrderStatus;
      role: Role;
    };
  };
};
