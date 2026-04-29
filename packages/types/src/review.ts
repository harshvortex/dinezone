import type { ID, Timestamps } from "./common";

export interface Review extends Timestamps {
  id: ID;
  userId: ID;
  restaurantId: ID;
  bookingId?: ID;
  overallRating: number;    // 1–5
  foodRating?: number;
  serviceRating?: number;
  ambienceRating?: number;
  valueRating?: number;
  title?: string;
  body?: string;
  imageUrls: string[];
  isVerified: boolean;      // tied to a completed booking
  helpfulCount: number;
  ownerReply?: string;
  ownerRepliedAt?: Date;
}

export interface CreateReviewDto {
  restaurantId: ID;
  bookingId?: ID;
  overallRating: number;
  foodRating?: number;
  serviceRating?: number;
  ambienceRating?: number;
  valueRating?: number;
  title?: string;
  body?: string;
}
