/**
 * Format a date to YYYY-MM-DD format
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date to YYYY-MM-DD HH:mm:ss format
 * @param date - Date to format
 * @returns Formatted date string with time
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * Check if a date is expired
 * @param date - Date to check
 * @returns true if date is in the past
 */
export function isExpired(date: Date): boolean {
  return date < new Date();
}

/**
 * Get days remaining until a date
 * @param date - Target date
 * @returns Number of days remaining (negative if expired)
 */
export function getDaysRemaining(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
