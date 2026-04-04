#!/usr/bin/env ts-node
/**
 * Script to normalize all date fields in Archive table to YYYY-MM-DD format
 *
 * Usage: npx ts-node scripts/normalize-dates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parse various date formats and normalize to YYYY-MM-DD
 * Supports formats:
 * - YYYY-MM-DD (2024-12-31)
 * - YYYYMMDD (20210127)
 * - YYYY (2011, auto-fill month=1, day=1)
 * - YYYY年MM月DD日 (2021年01月27日)
 * - YYYY年MM月DD (2021年01月27)
 * - YYYY年M月D日 (2021年1月27日)
 * - YYYY年M月D (2021年1月27)
 * - YYYY年M月 (2021年3月, auto-fill day=1)
 * - YYYY/MM/DD (2021/01/27)
 * - YYYY.MM.DD (2021.01.27)
 * - YYYY-MM (2021-01, auto-fill day=1)
 * - YYYY.MM (2021.01, auto-fill day=1)
 * - YYYY/MM (2021/01, auto-fill day=1)
 *
 * @param dateStr - Date string in various formats
 * @returns Normalized date string in YYYY-MM-DD format, or original string if parsing fails
 */
function parseAndNormalizeDate(dateStr: string | null): string {
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

  // Pattern 4: YYYY年MM月 (year-month in Chinese, auto-fill day=1)
  if (!year) {
    const pattern4 = /^(\d{4})年(\d{1,2})月$/;
    const match4 = trimmed.match(pattern4);
    if (match4) {
      year = parseInt(match4[1], 10);
      month = parseInt(match4[2], 10);
      day = 1;
    }
  }

  // Pattern 5: YYYY-MM or YYYY/MM or YYYY.MM (year-month, auto-fill day=1)
  if (!year) {
    const pattern5 = /^(\d{4})[-/.](\d{1,2})$/;
    const match5 = trimmed.match(pattern5);
    if (match5) {
      year = parseInt(match5[1], 10);
      month = parseInt(match5[2], 10);
      day = 1;
    }
  }

  // Pattern 6: YYYY only (auto-fill month=1, day=1)
  if (!year) {
    const pattern6 = /^(\d{4})$/;
    const match6 = trimmed.match(pattern6);
    if (match6) {
      year = parseInt(match6[1], 10);
      month = 1;
      day = 1;
    }
  }

  // If we couldn't parse the year, return original
  if (!year) {
    console.warn(`Unable to parse date: "${trimmed}"`);
    return trimmed;
  }

  // Validate year (reasonable range: 1900-2100)
  if (year < 1900 || year > 2100) {
    console.warn(`Year ${year} is out of valid range for date: "${trimmed}"`);
    return trimmed;
  }

  // Validate month
  if (month < 1 || month > 12) {
    console.warn(`Invalid month ${month} for date: "${trimmed}"`);
    return trimmed;
  }

  // Validate day
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    console.warn(`Invalid day ${day} for month ${month} in date: "${trimmed}"`);
    return trimmed;
  }

  // Format as YYYY-MM-DD
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');

  return `${year}-${formattedMonth}-${formattedDay}`;
}

async function main() {
  console.log('Starting date normalization...');

  // Fetch all archives with non-null date fields
  const archives = await prisma.archive.findMany({
    where: {
      date: { not: '' }
    },
    select: {
      archiveNo: true,
      date: true
    }
  });

  console.log(`Found ${archives.length} archives with date values`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const archive of archives) {
    if (!archive.date) continue;

    const normalizedDate = parseAndNormalizeDate(archive.date);

    // Only update if the date was changed
    if (normalizedDate && normalizedDate !== archive.date) {
      try {
        await prisma.archive.update({
          where: { archiveNo: archive.archiveNo },
          data: { date: normalizedDate }
        });
        console.log(`✓ Updated ${archive.archiveNo}: "${archive.date}" → "${normalizedDate}"`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Error updating ${archive.archiveNo}:`, error);
        errorCount++;
      }
    } else if (normalizedDate === archive.date) {
      skippedCount++;
    } else {
      console.warn(`⚠ Skipping ${archive.archiveNo}: could not normalize "${archive.date}"`);
      skippedCount++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Total archives processed: ${archives.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already normalized): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('Date normalization complete!');
}

main()
  .catch((error) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
