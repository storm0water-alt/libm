import { parseAndNormalizeDate } from '@/lib/utils/date';

describe('parseAndNormalizeDate', () => {
  test('should parse YYYY-MM-DD format', () => {
    expect(parseAndNormalizeDate('2024-12-31')).toBe('2024-12-31');
    expect(parseAndNormalizeDate('2021-01-27')).toBe('2021-01-27');
  });

  test('should parse YYYYMMDD format', () => {
    expect(parseAndNormalizeDate('20210127')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('20241231')).toBe('2024-12-31');
  });

  test('should parse YYYY format', () => {
    expect(parseAndNormalizeDate('2011')).toBe('2011-01-01');
    expect(parseAndNormalizeDate('2024')).toBe('2024-01-01');
  });

  test('should parse Chinese date formats', () => {
    expect(parseAndNormalizeDate('2021年01月27日')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('2021年01月27')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('2021年1月27日')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('2021年1月27')).toBe('2021-01-27');
  });

  test('should parse YYYY/MM/DD format', () => {
    expect(parseAndNormalizeDate('2021/01/27')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('2021/1/27')).toBe('2021-01-27');
  });

  test('should parse YYYY.MM.DD format', () => {
    expect(parseAndNormalizeDate('2021.01.27')).toBe('2021-01-27');
    expect(parseAndNormalizeDate('2021.1.27')).toBe('2021-01-27');
  });

  test('should handle empty and null values', () => {
    expect(parseAndNormalizeDate('')).toBe('');
    expect(parseAndNormalizeDate(null)).toBe('');
    expect(parseAndNormalizeDate(undefined)).toBe('');
    expect(parseAndNormalizeDate('   ')).toBe('');
  });

  test('should handle invalid dates', () => {
    expect(parseAndNormalizeDate('invalid')).toBe('');
    expect(parseAndNormalizeDate('2021-13-01')).toBe(''); // Invalid month
    expect(parseAndNormalizeDate('2021-02-30')).toBe(''); // Invalid day for February
  });

  test('should handle edge cases', () => {
    expect(parseAndNormalizeDate('2020-02-29')).toBe('2020-02-29'); // Leap year
    expect(parseAndNormalizeDate('1899-01-01')).toBe(''); // Year too old
    expect(parseAndNormalizeDate('2101-01-01')).toBe(''); // Year too new
  });
});
