import type { User } from "./user";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  role: string;
  iat: number;
  exp: number;
}
