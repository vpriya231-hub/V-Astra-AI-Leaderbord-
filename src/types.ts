export interface UserProfile {
  id: string;
  name: string;
  email: string;
  points: number; // Total / lifetime points
  monthlyPoints?: Record<string, number>; // Points by monthKey e.g. {"2026-08": 5}
  currentMonthPoints?: number; // Points in the ongoing IST month
  currentMonthKey?: string; // Current ongoing IST month key e.g. "2026-08"
  referralCode?: string;
  uniqueCode?: string; // Explicit unique referral code
  referredBy?: string;
  referredByName?: string;
  redeemedCode?: string;
  redeemedAt?: any;
  redeemedCodes?: string[]; // Array of unique referral codes redeemed by this user
  redeemedReferrals?: Record<string, { referrerId: string; referrerName?: string; redeemedAt?: any; monthKey?: string }>;
  photoURL?: string;
  shareCount?: number;
  referralCount?: number;
  createdAt?: any;
  updatedAt?: any;
  rank?: number;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  email?: string;
  points: number; // Monthly points for the selected month
  totalPoints?: number; // Lifetime points
  monthKey?: string; // IST month key e.g. "2026-08"
  referralCode?: string;
  uniqueCode?: string;
  referralCount?: number;
  photoURL?: string;
  rank?: number;
  updatedAt?: any;
}

export interface AppConfig {
  playStoreUrl: string;
  appName: string;
  shareMessage: string;
}
