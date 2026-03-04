#!/usr/bin/env ts-node
/**
 * Bucket Storage Verification Script
 *
 * This script verifies that the bucket storage algorithm works correctly.
 *
 * Usage: npx ts-node scripts/verify-bucket-storage.ts
 */

import {
  extractYearFromArchiveNo,
  calculateBucketNumber,
  calculateBucketPath,
  parseBucketFileUrl,
  getPdfBucketFilePath,
} from "../lib/storage-config";

console.log("=".repeat(80));
console.log("Bucket Storage Verification");
console.log("=".repeat(80));
console.log();

// Test cases for year extraction
console.log("1. Year Extraction from Archive Numbers:");
const yearTestCases = [
  { input: "00000-Y-2026-bgs-0001-00014", expected: "2026" },
  { input: "00000-Y-2011-bgs-0001-10011", expected: "2011" },
  { input: "00000-Y-1999-dept-0010-00001", expected: "1999" },
  { input: "invalid-format", expected: null },
  { input: "", expected: null },
];

yearTestCases.forEach(({ input, expected }) => {
  const result = extractYearFromArchiveNo(input);
  const status = result === expected ? "✅" : "❌";
  console.log(`   ${status} "${input}" -> ${result} (expected: ${expected})`);
});
console.log();

// Test cases for bucket number calculation
console.log("2. Bucket Number Calculation:");
const bucketTestCases = [
  { input: "00000-Y-2026-bgs-0001-00014", description: "Should be 0-9" },
  { input: "00000-Y-2011-bgs-0001-10011", description: "Should be 0-9" },
  { input: "00000-Y-2011-bgs-0001-10012", description: "Different from 10011" },
];

bucketTestCases.forEach(({ input, description }) => {
  const result = calculateBucketNumber(input);
  const valid = result >= 0 && result <= 9;
  const status = valid ? "✅" : "❌";
  console.log(`   ${status} "${input}" -> bucket ${result} (${description})`);
});
console.log();

// Test cases for full bucket path calculation
console.log("3. Full Bucket Path Calculation:");
const pathTestCases = [
  { input: "00000-Y-2026-bgs-0001-00014", expectedYear: "2026" },
  { input: "00000-Y-2011-bgs-0001-10011", expectedYear: "2011" },
];

pathTestCases.forEach(({ input, expectedYear }) => {
  const result = calculateBucketPath(input);
  console.log(`   Archive: ${input}`);
  console.log(`     - Year: ${result.year} (expected: ${expectedYear})`);
  console.log(`     - Bucket Number: ${result.bucketNumber}`);
  console.log(`     - Bucket Dir Name: ${result.bucketDirName}`);
  console.log(`     - Full Path: ${result.bucketPath}`);
  console.log();
});
console.log();

// Test cases for file path generation
console.log("4. PDF Bucket File Path Generation:");
const filePathTestCases = [
  { archiveNo: "00000-Y-2026-bgs-0001-00014", archiveId: "clh12345" },
  { archiveNo: "00000-Y-2011-bgs-0001-10011", archiveId: "abc67890" },
];

filePathTestCases.forEach(({ archiveNo, archiveId }) => {
  const filePath = getPdfBucketFilePath(archiveNo, archiveId);
  console.log(`   Archive: ${archiveNo}`);
  console.log(`     -> File Path: ${filePath}`);
  console.log();
});
console.log();

// Test cases for URL parsing
console.log("5. Bucket URL Parsing:");
const urlTestCases = [
  { input: "/pdfs/2026-0/clh12345.pdf", expected: { year: "2026", bucketNumber: 0, archiveId: "clh12345" } },
  { input: "/pdfs/2011-9/abc67890.pdf", expected: { year: "2011", bucketNumber: 9, archiveId: "abc67890" } },
  { input: "2026-0/clh12345.pdf", expected: { year: "2026", bucketNumber: 0, archiveId: "clh12345" } },
  { input: "clh12345.pdf", expected: null }, // Legacy format
];

urlTestCases.forEach(({ input, expected }) => {
  const result = parseBucketFileUrl(input);
  const match = JSON.stringify(result) === JSON.stringify(expected);
  const status = match ? "✅" : "❌";
  console.log(`   ${status} "${input}"`);
  console.log(`        Result: ${JSON.stringify(result)}`);
  console.log(`        Expected: ${JSON.stringify(expected)}`);
});
console.log();

// Summary
console.log("=".repeat(80));
console.log("Summary:");
console.log("=".repeat(80));
console.log();
console.log("The bucket storage system is designed to:");
console.log("  1. Extract year from archive number (档号)");
console.log("  2. Calculate bucket number (0-9) using hash algorithm");
console.log("  3. Create bucket directories in format: {year}-{bucket}");
console.log("  4. Store PDF files in appropriate bucket directories");
console.log();
console.log("Example mappings:");
console.log("  - 00000-Y-2026-bgs-0001-00014 -> 2026-{bucket}/clh12345.pdf");
console.log("  - 00000-Y-2011-bgs-0001-10011 -> 2011-{bucket}/abc67890.pdf");
console.log();
console.log("=".repeat(80));
