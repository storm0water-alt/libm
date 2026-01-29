import { hash, compare } from "bcrypt";

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password
 * @param saltRounds - Salt rounds (default: 10)
 * @returns Hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 10
): Promise<string> {
  return await hash(password, saltRounds);
}

/**
 * Verify a plain text password against a hashed password
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await compare(password, hashedPassword);
}

/**
 * Validate password strength according to security requirements
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one letter
 * - Contains at least one digit
 *
 * @param password - Password to validate
 * @returns Object with isValid flag and errorMessage if invalid
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      errorMessage: "密码至少 8 位",
    };
  }

  if (!/[A-Za-z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: "密码必须包含字母",
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      errorMessage: "密码必须包含数字",
    };
  }

  if (password.length > 100) {
    return {
      isValid: false,
      errorMessage: "密码最多 100 位",
    };
  }

  return { isValid: true };
}
