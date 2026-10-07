import type { Category, Product, Order, OrderItem } from "./schema";
import type { PublicUser } from "./user-dto";

// Joined catalog queries deliberately omit import metadata and category images.
export type CatalogCategory = Omit<Category, "image" | "externalId" | "externalSource"> &
  Partial<Pick<Category, "image" | "externalId" | "externalSource">>;
export type CatalogProduct = Omit<Product, "externalId" | "externalSource"> &
  Partial<Pick<Product, "externalId" | "externalSource">>;
export type ProductWithCategories = CatalogProduct & { categories: CatalogCategory[] };

// Guest-order queries include only display fields; other order queries may include more.
export type OrderProduct = Pick<Product,
  "id" | "name" | "name_en" | "name_he" | "name_ar" | "unit" | "price" |
  "imageUrl" | "imageUrl_en" | "imageUrl_he" | "imageUrl_ar"> &
  Partial<Omit<Product,
    "id" | "name" | "name_en" | "name_he" | "name_ar" | "unit" | "price" |
    "imageUrl" | "imageUrl_en" | "imageUrl_he" | "imageUrl_ar">>;
export type OrderWithItems = Order & {
  items: Array<OrderItem & { product: OrderProduct }>;
  user: PublicUser | null;
};
