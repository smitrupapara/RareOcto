/**
 * Hand-written shape until we run `supabase gen types typescript`.
 * Mirrors the schema in CLAUDE.md / migrations.
 */

export type ProductSize = "S" | "M" | "L";
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

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  base_price: number;
  images: string[];
  available_sizes: ProductSize[];
  stock: number;
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
  quantity: number;
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
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, "id">; Update: Partial<Profile>; Relationships: [] };
      products: { Row: Product; Insert: Omit<Product, "id" | "created_at"> & { id?: string }; Update: Partial<Product>; Relationships: [] };
      saved_previews: { Row: SavedPreview; Insert: Omit<SavedPreview, "id" | "created_at"> & { id?: string }; Update: Partial<SavedPreview>; Relationships: [] };
      cart_items: { Row: CartItem; Insert: Omit<CartItem, "id"> & { id?: string }; Update: Partial<CartItem>; Relationships: [] };
      orders: { Row: Order; Insert: Omit<Order, "id" | "created_at"> & { id?: string }; Update: Partial<Order>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      product_size: ProductSize;
      category: Category;
      order_status: OrderStatus;
      role: Role;
    };
  };
};
