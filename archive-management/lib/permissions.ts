/**
 * Admin-only routes that require admin role
 */
const ADMIN_ROUTES = ["/users", "/import", "/config"];

/**
 * Check if a given path requires admin access
 */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Get redirect URL for unauthorized access
 * @returns URL to redirect to
 */
export function getUnauthorizedRedirectUrl(): string {
  return "/search";
}
