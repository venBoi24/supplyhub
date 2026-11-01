export type Availability = "in-stock" | "low-stock" | "sold-out";
export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc";

export interface CatalogImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface Category {
  slug: string;
  name: string;
  headline: string;
  description: string;
}

export interface Vendor {
  slug: string;
  name: string;
  monogram: string;
  location: string;
  discipline: string;
  story: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  vendorSlug: string;
  categorySlug: string;
  priceCents: number;
  compareAtPriceCents?: number;
  currency: string;
  summary: string;
  description: string;
  makerNote: string;
  materials: readonly string[];
  dimensions: string;
  care: string;
  inventory: number;
  image: CatalogImage;
  images: readonly CatalogImage[];
  featured: boolean;
  addedAt: string;
}

export interface ProductListing extends Product {
  vendor: Vendor;
  category: Category;
  availability: Availability;
}

export interface VendorSummary extends Vendor {
  productCount: number;
}

export interface CategorySummary extends Category {
  productCount: number;
}

export interface CatalogFilters {
  category?: string;
  vendor?: string;
  query?: string;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface ProductPage {
  items: readonly ProductListing[];
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
}

export const PRODUCTS_PER_PAGE = 12;
