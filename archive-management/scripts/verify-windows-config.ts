#!/usr/bin/env ts-node
/**
 * Storage Configuration Verification Script
 *
 * This script helps verify that the PDF storage path is configured correctly,
 * especially on Windows systems where path issues are common.
 *
 * Usage: npx ts-node scripts/verify-windows-config.ts
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";

// Import the storage configuration function
import { getPdfStoragePath } from "../lib/storage-config";

console.log("=".repeat(80));
console.log("PDF Storage Configuration Verification");
console.log("=".repeat(80));
console.log();

// 1. Check environment variables
console.log("1. Environment Variables:");
console.log("   - PDF_STORAGE_PATH:", process.env.PDF_STORAGE_PATH || "(not set)");
console.log("   - ARCHIVE_STORAGE_PATH:", process.env.ARCHIVE_STORAGE_PATH || "(not set)");
console.log();

// 2. Get resolved storage path
const storagePath = getPdfStoragePath();
console.log("2. Resolved Storage Path:");
console.log("   - Path:", storagePath);
console.log("   - Current Working Directory:", process.cwd());
console.log();

// 3. Check if storage directory exists
console.log("3. Storage Directory Status:");
const dirExists = existsSync(storagePath);
console.log("   - Exists:", dirExists ? "✅ Yes" : "❌ No");

if (dirExists) {
  try {
    const files = readdirSync(storagePath);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith(".pdf"));
    console.log("   - Total files:", files.length);
    console.log("   - PDF files:", pdfFiles.length);

    if (pdfFiles.length > 0) {
      console.log("   - Sample PDF files:");
      pdfFiles.slice(0, 5).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (pdfFiles.length > 5) {
        console.log(`     ... and ${pdfFiles.length - 5} more`);
      }
    }
  } catch (error) {
    console.log("   - Error reading directory:", error);
  }
} else {
  console.log("   ⚠️  Storage directory does not exist!");
  console.log("   Please create it or check your configuration.");
}
console.log();

// 4. Check path format
console.log("4. Path Format Analysis:");
console.log("   - Platform:", process.platform);
console.log("   - Path separator:", require("path").sep);

const hasBackslash = storagePath.includes("\\");
const hasForwardSlash = storagePath.includes("/");
const hasTrailingSlash = storagePath.endsWith("\\") || storagePath.endsWith("/");

console.log("   - Contains backslash:", hasBackslash);
console.log("   - Contains forward slash:", hasForwardSlash);
console.log("   - Has trailing slash:", hasTrailingSlash ? "❌ Yes (should be removed)" : "✅ No");
console.log();

// 5. Test path joining
console.log("5. Path Joining Test:");
const testFileName = "test-archive.pdf";
const fullPath = join(storagePath, testFileName);
console.log(`   - join("${storagePath}", "${testFileName}")`);
console.log(`   - Result: ${fullPath}`);
console.log();

// 6. Summary
console.log("=".repeat(80));
console.log("Summary:");
console.log("=".repeat(80));

if (dirExists) {
  console.log("✅ Configuration looks good!");
  console.log();
  console.log("Next steps:");
  console.log("1. Import a PDF file and verify it's saved to:", storagePath);
  console.log("2. Try to preview the PDF in the archive management interface");
  console.log("3. Check the console logs to verify the same path is used");
} else {
  console.log("❌ Storage directory does not exist!");
  console.log();
  console.log("Please:");
  console.log("1. Check your environment variables (PDF_STORAGE_PATH or ARCHIVE_STORAGE_PATH)");
  console.log("2. Create the storage directory:", storagePath);
  console.log("3. Ensure the application has read/write permissions");
}
console.log();
console.log("=".repeat(80));
