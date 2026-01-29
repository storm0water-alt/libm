/**
 * Configuration Type Validator
 *
 * Provides Zod-based validation for system configuration values based on their type.
 * This ensures data integrity and prevents invalid configuration values from being stored.
 *
 * Supported Types:
 * - string: Accepts any string value
 * - number: Validates and coerces to number type
 * - boolean: Validates and coerces to boolean type
 * - json: Validates JSON format and parses to object
 *
 * Features:
 * - Type-safe validation using Zod schemas
 * - Automatic type coercion for number and boolean
 * - Detailed error messages for invalid values
 * - Support for complex JSON structures
 */

import { z } from "zod";

/**
 * Configuration type enumeration
 *
 * Defines the supported configuration types in the system.
 */
export type ConfigType = "string" | "number" | "boolean" | "json";

/**
 * Zod validators for each configuration type
 *
 * Each validator provides type-specific validation and coercion:
 * - string: Accepts any string value
 * - number: Coerces string input to number (e.g., "123" -> 123)
 * - boolean: Coerces string input to boolean (e.g., "true" -> true)
 * - json: Parses JSON string and validates format
 *
 * @example
 * ```ts
 * // Validate a string
 * configValidators.string.parse("hello"); // "hello"
 *
 * // Validate a number (from string or number)
 * configValidators.number.parse("123"); // 123
 * configValidators.number.parse(456);   // 456
 *
 * // Validate a boolean (from string or boolean)
 * configValidators.boolean.parse("true");  // true
 * configValidators.boolean.parse("false"); // false
 *
 * // Validate JSON
 * configValidators.json.parse('{"key": "value"}'); // { key: "value" }
 * ```
 */
export const configValidators = {
  /**
   * String type validator
   * Accepts any string value without additional constraints
   */
  string: z.string(),

  /**
   * Number type validator
   * Coerces input to number, validates that it's a valid number
   *
   * Accepts:
   * - String numbers: "123", "45.67"
   * - Number values: 123, 45.67
   *
   * Rejects:
   * - Non-numeric strings: "abc"
   * - Special values: NaN, Infinity
   */
  number: z.coerce
    .number({
      message: "配置值必须是数字",
    })
    .refine((val) => !Number.isNaN(val), {
      message: "配置值不能为 NaN",
    })
    .refine((val) => Number.isFinite(val), {
      message: "配置值不能为 Infinity",
    }),

  /**
   * Boolean type validator
   * Coerces input to boolean value
   *
   * Accepts:
   * - Boolean values: true, false
   * - String "true"/"false" (case-insensitive)
   * - Numeric values: 1 (true), 0 (false)
   *
   * Rejects:
   * - Non-boolean strings: "yes", "no"
   * - Other values: null, undefined
   */
  boolean: z
    .union([
      z.boolean(),
      z.string(),
      z.number(),
    ], {
      message: "配置值必须是布尔值 (true/false)",
    })
    .transform((val, ctx) => {
      // If already boolean, return as is
      if (typeof val === "boolean") {
        return val;
      }

      // If string, parse "true"/"false" (case-insensitive)
      if (typeof val === "string") {
        const lowerVal = val.toLowerCase().trim();
        if (lowerVal === "true") {
          return true;
        }
        if (lowerVal === "false") {
          return false;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "配置值必须是 'true' 或 'false'",
        });
        return z.NEVER;
      }

      // If number, treat 1 as true, 0 as false
      if (typeof val === "number") {
        if (val === 1) return true;
        if (val === 0) return false;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "配置值必须是 0 或 1",
        });
        return z.NEVER;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "配置值必须是布尔值 (true/false)",
      });
      return z.NEVER;
    }),

  /**
   * JSON type validator
   * Validates JSON format and parses to object
   *
   * Accepts:
   * - Valid JSON objects: '{"key": "value"}'
   * - Valid JSON arrays: '[1, 2, 3]'
   * - Valid JSON primitives: '"hello"', '123', 'true', 'null'
   *
   * Rejects:
   * - Invalid JSON syntax: '{key: "value"}', '{"key": undefined}'
   * - Trailing commas: '[1, 2, 3,]'
   * - Single quotes: "{'key': 'value'}"
   */
  json: z
    .string({
      message: "配置值不能为空",
    })
    .transform((val, ctx) => {
      try {
        return JSON.parse(val);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `无效的 JSON 格式: ${error instanceof Error ? error.message : "语法错误"}`,
        });
        return z.NEVER;
      }
    }),
} as const;

/**
 * Validate a configuration value based on its type
 *
 * This function validates and transforms configuration values according to their type.
 * It performs type coercion for number and boolean types, and JSON parsing for json type.
 *
 * @param value - The configuration value to validate (typically a string from the database)
 * @param type - The configuration type (string, number, boolean, or json)
 * @returns The validated and transformed value
 * @throws {z.ZodError} When validation fails with detailed error information
 *
 * @example
 * ```ts
 * // Validate a string value
 * const result = validateConfigValue("hello world", "string");
 * console.log(result); // "hello world"
 *
 * // Validate a number value
 * const number = validateConfigValue("365", "number");
 * console.log(number); // 365 (number type)
 * console.log(typeof number); // "number"
 *
 * // Validate a boolean value
 * const bool = validateConfigValue("true", "boolean");
 * console.log(bool); // true (boolean type)
 *
 * // Validate a JSON value
 * const json = validateConfigValue('{"retention": 365}', "json");
 * console.log(json); // { retention: 365 } (object type)
 *
 * // Handle validation errors
 * try {
 *   validateConfigValue("not a number", "number");
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.log(error.errors[0].message);
 *     // "配置值必须是数字"
 *   }
 * }
 * ```
 */
export function validateConfigValue(
  value: string,
  type: ConfigType
): string | number | boolean | any {
  const validator =
    configValidators[type as keyof typeof configValidators] ||
    configValidators.string;

  return validator.parse(value);
}

/**
 * Safely validate a configuration value without throwing errors
 *
 * Similar to validateConfigValue but returns a result object instead of throwing.
 * Useful when you want to handle validation errors gracefully.
 *
 * @param value - The configuration value to validate
 * @param type - The configuration type
 * @returns Result object with success flag and data or error
 *
 * @example
 * ```ts
 * const result = safeValidateConfigValue("123", "number");
 * if (result.success) {
 *   console.log(result.data); // 123
 * } else {
 *   console.error(result.error); // ZodError
 * }
 *
 * const invalid = safeValidateConfigValue("abc", "number");
 * if (!invalid.success) {
 *   console.log(invalid.error.errors[0].message);
 *   // "配置值必须是数字"
 * }
 * ```
 */
export function safeValidateConfigValue(
  value: string,
  type: ConfigType
): {
  success: true;
  data: string | number | boolean | any;
} | {
  success: false;
  error: z.ZodError;
} {
  const validator =
    configValidators[type as keyof typeof configValidators] ||
    configValidators.string;

  const result = validator.safeParse(value);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Get a human-readable error message from a validation error
 *
 * Extracts the first error message from a ZodError for display to users.
 *
 * @param error - The ZodError from validation
 * @returns A user-friendly error message
 *
 * @example
 * ```ts
 * try {
 *   validateConfigValue("invalid", "number");
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     const message = getValidationErrorMessage(error);
 *     console.log(message); // "配置值必须是数字"
 *   }
 * }
 * ```
 */
export function getValidationErrorMessage(error: z.ZodError): string {
  const issues = error.issues;
  if (issues.length > 0) {
    return issues[0].message;
  }
  return "配置值格式错误";
}

/**
 * Type guard to check if a string is a valid config type
 *
 * @param type - The type string to check
 * @returns True if the type is valid
 *
 * @example
 * ```ts
 * if (isValidConfigType("number")) {
 *   // Safe to use with validateConfigValue
 *   const result = validateConfigValue("123", "number");
 * }
 *
 * if (!isValidConfigType("invalid")) {
 *   console.log("Invalid config type");
 * }
 * ```
 */
export function isValidConfigType(type: string): type is ConfigType {
  return ["string", "number", "boolean", "json"].includes(type);
}
