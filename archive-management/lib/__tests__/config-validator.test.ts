/**
 * Unit tests for config-validator
 *
 * Tests the configuration type validation functionality
 */

import { describe, it, expect } from "vitest";
import {
  configValidators,
  validateConfigValue,
  safeValidateConfigValue,
  getValidationErrorMessage,
  isValidConfigType,
} from "../config-validator";
import { z } from "zod";

describe("configValidators", () => {
  describe("string validator", () => {
    it("should accept any string value", () => {
      expect(configValidators.string.parse("hello world")).toBe("hello world");
      expect(configValidators.string.parse("123")).toBe("123");
      expect(configValidators.string.parse("true")).toBe("true");
      expect(configValidators.string.parse("")).toBe("");
    });
  });

  describe("number validator", () => {
    it("should coerce string numbers to number type", () => {
      expect(configValidators.number.parse("123")).toBe(123);
      expect(configValidators.number.parse("45.67")).toBe(45.67);
      expect(configValidators.number.parse("-10")).toBe(-10);
    });

    it("should accept number values", () => {
      expect(configValidators.number.parse(123)).toBe(123);
      expect(configValidators.number.parse(45.67)).toBe(45.67);
    });

    it("should reject non-numeric strings", () => {
      expect(() => configValidators.number.parse("abc")).toThrow();
      expect(() => configValidators.number.parse("hello")).toThrow();
    });

    it("should reject NaN", () => {
      expect(() => configValidators.number.parse(NaN)).toThrow();
    });

    it("should reject Infinity", () => {
      expect(() => configValidators.number.parse(Infinity)).toThrow();
    });
  });

  describe("boolean validator", () => {
    it("should coerce string 'true' to true", () => {
      expect(configValidators.boolean.parse("true")).toBe(true);
      expect(configValidators.boolean.parse("True")).toBe(true);
      expect(configValidators.boolean.parse("TRUE")).toBe(true);
    });

    it("should coerce string 'false' to false", () => {
      expect(configValidators.boolean.parse("false")).toBe(false);
      expect(configValidators.boolean.parse("False")).toBe(false);
      expect(configValidators.boolean.parse("FALSE")).toBe(false);
    });

    it("should accept boolean values", () => {
      expect(configValidators.boolean.parse(true)).toBe(true);
      expect(configValidators.boolean.parse(false)).toBe(false);
    });

    it("should coerce numeric values", () => {
      expect(configValidators.boolean.parse(1)).toBe(true);
      expect(configValidators.boolean.parse(0)).toBe(false);
    });
  });

  describe("json validator", () => {
    it("should parse valid JSON objects", () => {
      const result = configValidators.json.parse('{"key": "value"}');
      expect(result).toEqual({ key: "value" });
    });

    it("should parse valid JSON arrays", () => {
      const result = configValidators.json.parse('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse valid JSON primitives", () => {
      expect(configValidators.json.parse('"hello"')).toBe("hello");
      expect(configValidators.json.parse("123")).toBe(123);
      expect(configValidators.json.parse("true")).toBe(true);
      expect(configValidators.json.parse("null")).toBe(null);
    });

    it("should reject invalid JSON", () => {
      expect(() => configValidators.json.parse("{key: value}")).toThrow();
      expect(() => configValidators.json.parse("{'key': 'value'}")).toThrow();
      expect(() => configValidators.json.parse("[1, 2, 3,]")).toThrow();
    });
  });
});

describe("validateConfigValue", () => {
  it("should validate string values", () => {
    expect(validateConfigValue("hello", "string")).toBe("hello");
  });

  it("should validate number values", () => {
    expect(validateConfigValue("365", "number")).toBe(365);
    expect(validateConfigValue("45.67", "number")).toBe(45.67);
  });

  it("should validate boolean values", () => {
    expect(validateConfigValue("true", "boolean")).toBe(true);
    expect(validateConfigValue("false", "boolean")).toBe(false);
  });

  it("should validate JSON values", () => {
    expect(validateConfigValue('{"retention": 365}', "json")).toEqual({
      retention: 365,
    });
  });

  it("should default to string validator for unknown types", () => {
    expect(validateConfigValue("hello", "unknown" as any)).toBe("hello");
  });

  it("should throw on validation error", () => {
    expect(() => validateConfigValue("abc", "number")).toThrow(z.ZodError);
    expect(() => validateConfigValue("invalid", "json")).toThrow(z.ZodError);
  });
});

describe("safeValidateConfigValue", () => {
  it("should return success result for valid values", () => {
    const result = safeValidateConfigValue("365", "number");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(365);
    }
  });

  it("should return error result for invalid values", () => {
    const result = safeValidateConfigValue("abc", "number");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
    }
  });
});

describe("getValidationErrorMessage", () => {
  it("should extract error message from ZodError", () => {
    try {
      validateConfigValue("abc", "number");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = getValidationErrorMessage(error);
        expect(message).toBeTruthy();
        expect(typeof message).toBe("string");
      }
    }
  });

  it("should return default message for error without issues", () => {
    const mockError = new z.ZodError([]);
    const message = getValidationErrorMessage(mockError);
    expect(message).toBe("配置值格式错误");
  });
});

describe("isValidConfigType", () => {
  it("should return true for valid config types", () => {
    expect(isValidConfigType("string")).toBe(true);
    expect(isValidConfigType("number")).toBe(true);
    expect(isValidConfigType("boolean")).toBe(true);
    expect(isValidConfigType("json")).toBe(true);
  });

  it("should return false for invalid config types", () => {
    expect(isValidConfigType("invalid")).toBe(false);
    expect(isValidConfigType("array")).toBe(false);
    expect(isValidConfigType("object")).toBe(false);
    expect(isValidConfigType("")).toBe(false);
  });
});
