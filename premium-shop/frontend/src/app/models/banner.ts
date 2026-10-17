export interface ImageValue {
  imageUrl: string;
  imagePublicId?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

export interface Banner extends ImageValue {
  id: string;
  title?: string;
  altText: string;
  targetUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const US_TRAVEL_BANNER: Banner = {
  id: "alice-store-travel-deals-us",
  title: "Alice Store Travel Deals",
  imageUrl: "/assets/Alice%20Store%20Travel%20Deals%20Banner.png",
  altText: "Alice Store travel deals: save up to 50% on flights, hotels, rentals, and more.",
  targetUrl: "https://t.me/AliceServiceStore",
};

export function withUsTravelBanner(banners: Banner[], countryCode?: string): Banner[] {
  const regularBanners = banners.filter(banner => banner.id !== US_TRAVEL_BANNER.id);
  return countryCode?.toUpperCase() === "US"
    ? [...regularBanners, US_TRAVEL_BANNER]
    : regularBanners;
}

export interface UploadedImage {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}
