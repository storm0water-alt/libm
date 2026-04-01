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

/**
 * Parse various date formats and normalize to YYYY-MM-DD
 * Supports formats:
 * - YYYY-MM-DD (2024-12-31)
 * - YYYYMMDD (20210127)
 * - YYYY (2011)
 * - YYYY年MM月DD日 (2021年01月27日)
 * - YYYY年MM月DD (2021年01月27)
 * - YYYY年M月D日 (2021年1月27日)
 * - YYYY年M月D (2021年1月27)
 * - YYYY/MM/DD (2021/01/27)
 * - YYYY.MM.DD (2021.01.27)
 *
 * @param dateStr - Date string in various formats
 * @returns Normalized date string in YYYY-MM-DD format, or empty string if parsing fails
 */
export function parseAndNormalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return '';
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return '';
  }

  let year: number | null = null;
  let month: number = 1;  // Default to January
  let day: number = 1;    // Default to 1st

  // Try different patterns
  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const pattern1 = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    year = parseInt(match1[1], 10);
    month = parseInt(match1[2], 10);
    day = parseInt(match1[3], 10);
  }

  // Pattern 2: YYYYMMDD
  if (!year) {
    const pattern2 = /^(\d{4})(\d{2})(\d{2})$/;
    const match2 = trimmed.match(pattern2);
    if (match2) {
      year = parseInt(match2[1], 10);
      month = parseInt(match2[2], 10);
      day = parseInt(match2[3], 10);
    }
  }

  // Pattern 3: YYYY年MM月DD日 or YYYY年MM月DD or YYYY年M月D日 or YYYY年M月D
  if (!year) {
    const pattern3 = /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/;
    const match3 = trimmed.match(pattern3);
    if (match3) {
      year = parseInt(match3[1], 10);
      month = parseInt(match3[2], 10);
      day = parseInt(match3[3], 10);
    }
  }

  // Pattern 4: YYYY only
  if (!year) {
    const pattern4 = /^(\d{4})$/;
    const match4 = trimmed.match(pattern4);
    if (match4) {
      year = parseInt(match4[1], 10);
      month = 1;
      day = 1;
    }
  }

  // If we couldn't parse the year, return empty string
  if (!year) {
    console.warn(`Unable to parse date: "${trimmed}"`);
    return '';
  }

  // Validate year (reasonable range: 1900-2100)
  if (year < 1900 || year > 2100) {
    console.warn(`Year ${year} is out of valid range for date: "${trimmed}"`);
    return '';
  }

  // Validate month
  if (month < 1 || month > 12) {
    console.warn(`Invalid month ${month} for date: "${trimmed}"`);
    return '';
  }

  // Validate day
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    console.warn(`Invalid day ${day} for month ${month} in date: "${trimmed}"`);
    return '';
  }

  // Format as YYYY-MM-DD
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');

  return `${year}-${formattedMonth}-${formattedDay}`;
}

/**
 * Parsed archive number fields
 * 档号解析结果
 */
export interface ParsedArchiveNo {
  fondsNo: string;         // 全宗号
  retentionCode: string;   // 保管期限代码
  retentionPeriod: string; // 保管期限
  year: string;            // 年度
  deptCode: string;        // 机构问题代码
  boxNo: string;           // 盒号
  pieceNo: string;         // 件号
  isValid: boolean;        // 是否有效解析
}

/**
 * Map retention code to retention period
 * 保管期限代码映射到保管期限
 */
function getRetentionPeriod(code: string): string {
  const mapping: Record<string, string> = {
    'Y': '永久',
    'y': '永久',
    'C': '长期',
    'c': '长期',
    'D': '短期',
    'd': '短期',
    '1': '10年',
    '3': '30年',
  };
  return mapping[code] || '';
}

/**
 * Parse archive number (档号) and extract all fields
 *
 * Archive number format: {全宗号-保管期限代码-年度-机构问题代码-盒号-件号}
 * Example: 00000-Y-2026-bgs-0001-00014
 *          00000-Y-2011-bgs-0001-10011
 *
 * Fields:
 * - fondsNo: 全宗号 (e.g., "00000")
 * - retentionCode: 保管期限代码 (e.g., "Y", "1", "3")
 * - retentionPeriod: 保管期限 (e.g., "永久", "10年", "30年")
 * - year: 年度 (e.g., "2026")
 * - deptCode: 机构问题代码 (e.g., "bgs")
 * - boxNo: 盒号 (e.g., "0001")
 * - pieceNo: 件号 (e.g., "00014")
 *
 * @param archiveNo - Archive number string
 * @returns ParsedArchiveNo object with all extracted fields
 */
export function parseArchiveNo(archiveNo: string): ParsedArchiveNo {
  const defaultResult: ParsedArchiveNo = {
    fondsNo: '',
    retentionCode: '',
    retentionPeriod: '',
    year: '',
    deptCode: '',
    boxNo: '',
    pieceNo: '',
    isValid: false,
  };

  if (!archiveNo || typeof archiveNo !== 'string') {
    return defaultResult;
  }

  const trimmed = archiveNo.trim();
  if (!trimmed) {
    return defaultResult;
  }

  // Split by dash
  const parts = trimmed.split('-');

  // Standard format: 6 parts separated by dash
  // {全宗号-保管期限代码-年度-机构问题代码-盒号-件号}
  if (parts.length === 6) {
    const [fondsNo, retentionCode, year, deptCode, boxNo, pieceNo] = parts;

    // Validate year is a 4-digit number
    const yearValid = /^\d{4}$/.test(year);

    if (yearValid) {
      return {
        fondsNo,
        retentionCode,
        retentionPeriod: getRetentionPeriod(retentionCode),
        year,
        deptCode,
        boxNo,
        pieceNo,
        isValid: true,
      };
    }
  }

  // Try to extract at least the year from any format
  // Look for a 4-digit year pattern
  const yearMatch = trimmed.match(/(^|-)(\d{4})(-|$)/);
  if (yearMatch) {
    return {
      ...defaultResult,
      year: yearMatch[2],
      isValid: false, // Partial parse, not fully valid
    };
  }

  return defaultResult;
}
