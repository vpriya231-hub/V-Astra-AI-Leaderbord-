/**
 * Helper utilities for referral codes and sharing
 */

export const MICROSOFT_STORE_URL = 'https://apps.microsoft.com/store/detail/9NR87WK2VV23?cid=DevShareMCLPCS';
export const PLAY_STORE_URL = MICROSOFT_STORE_URL; // Backward-compatible alias
export const LEADERBOARD_WEB_URL = 'https://v-astra-ai-leaderbord.onrender.com';

/**
 * Helper to get current Indian Standard Time (IST) Month Key (e.g. "2026-08")
 */
export function getCurrentISTMonthKey(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || `${now.getUTCFullYear()}`;
  const month = parts.find(p => p.type === 'month')?.value || `0${now.getUTCMonth() + 1}`.slice(-2);
  return `${year}-${month}`;
}

/**
 * Get human-readable month title formatted in IST (e.g. "August 2026")
 */
export function getCurrentISTMonthName(monthKey?: string): string {
  if (monthKey && monthKey.includes('-')) {
    const [y, m] = monthKey.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Generate a consistent, uppercase, friendly referral code for a user
 * e.g., VA-XXXXXX
 */
export function generateUserReferralCode(userId: string): string {
  if (!userId) return 'VA-COMMUNITY';
  const clean = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = clean.length >= 6 ? clean.slice(0, 6) : (clean + '123456').slice(0, 6);
  return `VA-${suffix}`;
}

/**
 * Build pre-filled English share message with both links and unique code in the exact required format:
 *
 * Hey! Check out this amazing app:
 * 💻 Download App (Microsoft Store): https://apps.microsoft.com/store/detail/9NR87WK2VV23?cid=DevShareMCLPCS
 * 🎁 Use my referral code: [USER_UNIQUE_CODE]
 * 🌐 After installing, paste my code here to help me win the leaderboard: https://v-astra-ai-leaderbord.onrender.com
 */
export function getShareMessage(referralCode: string): string {
  return `Hey! Check out this amazing app:
💻 Download App (Microsoft Store): https://apps.microsoft.com/store/detail/9NR87WK2VV23?cid=DevShareMCLPCS
🎁 Use my referral code: ${referralCode}
🌐 After installing, paste my code here to help me win the leaderboard: https://v-astra-ai-leaderbord.onrender.com`;
}

/**
 * Backwards-compatible aliases
 */
export function getWhatsAppShareMessage(referralCode: string): string {
  return getShareMessage(referralCode);
}

export function getGenericShareMessage(referralCode: string): string {
  return getShareMessage(referralCode);
}
