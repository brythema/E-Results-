/**
 * Security & Data Sanitization Utilities
 * Protects against XSS, input injection, and unintended payload tampering.
 */

/**
 * Strips HTML tags, script constructs, and dangerous characters from user input strings.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  if (typeof input !== 'string') return String(input);

  return input
    // Remove explicit HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: pseudo-protocol
    .replace(/javascript:/gi, '')
    // Remove inline event handlers (e.g., onload=, onclick=)
    .replace(/on\w+\s*=/gi, '')
    // Remove data: URLs that might execute scripts
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Enforces safe numeric bounds on test and exam scores.
 */
export function sanitizeScore(value: number | string, maxLimit: number): number {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.max(0, Math.min(Math.round(num * 10) / 10, maxLimit));
}

/**
 * Validates email format with basic RFC 5322 regex
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates phone numbers (supports international & local formats)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+()-\s]/g, '').trim();
}

/**
 * Simple client-side throttle state tracker to prevent message spamming
 */
export class RateLimiter {
  private lastActionTimestamp: Map<string, number> = new Map();

  /**
   * Checks if an action is allowed for the given key.
   * @param key Unique key (e.g. 'chat_send_user123')
   * @param cooldownSeconds Cooldown duration in seconds (default 2s)
   * @returns { allowed: boolean, remainingSeconds: number }
   */
  public check(key: string, cooldownSeconds: number = 2): { allowed: boolean; remainingSeconds: number } {
    const now = Date.now();
    const lastTime = this.lastActionTimestamp.get(key) || 0;
    const elapsedSeconds = (now - lastTime) / 1000;

    if (elapsedSeconds < cooldownSeconds) {
      const remaining = Math.ceil(cooldownSeconds - elapsedSeconds);
      return { allowed: false, remainingSeconds: remaining };
    }

    this.lastActionTimestamp.set(key, now);
    return { allowed: true, remainingSeconds: 0 };
  }

  public reset(key: string): void {
    this.lastActionTimestamp.delete(key);
  }
}

export const globalRateLimiter = new RateLimiter();
