export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  description: string;
  stock: number;
  imagePublicId?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  durationMonths?: number | null;
  planLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}
