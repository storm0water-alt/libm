/**
 * CSV Import Service
 *
 * Handles CSV file import to update archive information
 */

import { prisma } from "@/lib/prisma";
import { createLog } from "./log.service";
import { readTextWithEncodingDetection } from "@/lib/encoding";

/**
 * Parse CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Process CSV upload and create import record
 */
export async function processCSVUpload(
  file: File,
  username: string,
  userId: string
): Promise<{
  success: boolean;
  importRecordId?: string;
  message?: string;
  error?: string;
}> {
  try {
    console.log('[CSV Import Service] Starting CSV import:', file.name);

    // Read CSV file content with encoding detection
    const text = await readTextWithEncodingDetection(file);

    // Parse CSV
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV 文件为空或格式错误',
      };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log('[CSV Import Service] Headers:', headers);

    // Validate headers - must have 档号
    if (!headers.includes('档号')) {
      return {
        success: false,
        error: 'CSV 文件缺少必需列："档号"',
      };
    }

    // Parse data rows
    const dataRows = lines.slice(1).map(line => parseCSVLine(line));
    console.log('[CSV Import Service] Data rows:', dataRows.length);

    // Create import record
    const importRecord = await prisma.importRecord.create({
      data: {
        type: "csv",
        total: dataRows.length,
        processed: 0,
        failed: 0,
        status: "pending",
        user: {
          connect: { username: username },
        },
        fileName: file.name,
      },
    });

    console.log('[CSV Import Service] Import record created:', importRecord.id);

    // Start async processing
    processCSVData(importRecord.id, headers, dataRows, username, userId).catch((error) => {
      console.error('[CSV Import Service] Error processing CSV:', error);
    });

    // Log the CSV import start
    await createLog({
      operator: username,
      operation: "csv_import",
      target: `CSV 导入: ${file.name} (${dataRows.length} 条记录)`,
      ip: "",
      userId: userId,
    });

    return {
      success: true,
      importRecordId: importRecord.id,
      message: `开始处理 ${dataRows.length} 条档案信息`,
    };
  } catch (error) {
    console.error('[CSV Import Service] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV 导入失败',
    };
  }
}

/**
 * Check if a value is valid (non-empty after trimming)
 * Used to prevent empty CSV values from overwriting existing database values
 * @param value - The value to check
 * @returns true if the value is valid (non-empty after trimming), false otherwise
 */
function isValidValue(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  return value.trim().length > 0;
}

/**
 * Normalize retention period and code
 * Maps retention period to standard values:
 * - 10年 → retentionPeriod: "10年", retentionCode: "1"
 * - 30年 → retentionPeriod: "30年", retentionCode: "3"
 * - 永久 → retentionPeriod: "永久", retentionCode: "Y"
 *
 * If not matching, default to "永久"
 */
function normalizeRetentionPeriod(
  period?: string,
  code?: string
): { retentionPeriod: string; retentionCode: string } {
  // Valid retention period mappings
  const validMappings: Record<string, { retentionPeriod: string; retentionCode: string }> = {
    '10年': { retentionPeriod: '10年', retentionCode: '1' },
    '10': { retentionPeriod: '10年', retentionCode: '1' },
    '1': { retentionPeriod: '10年', retentionCode: '1' },
    '30年': { retentionPeriod: '30年', retentionCode: '3' },
    '30': { retentionPeriod: '30年', retentionCode: '3' },
    '3': { retentionPeriod: '30年', retentionCode: '3' },
    '永久': { retentionPeriod: '永久', retentionCode: 'Y' },
    'y': { retentionPeriod: '永久', retentionCode: 'Y' },
    'Y': { retentionPeriod: '永久', retentionCode: 'Y' },
    '长期': { retentionPeriod: '长期', retentionCode: 'C' },
    'c': { retentionPeriod: '长期', retentionCode: 'C' },
    'C': { retentionPeriod: '长期', retentionCode: 'C' },
    '短期': { retentionPeriod: '短期', retentionCode: 'D' },
    'd': { retentionPeriod: '短期', retentionCode: 'D' },
    'D': { retentionPeriod: '短期', retentionCode: 'D' },
  };

  // Try to match by period first
  if (period && validMappings[period.trim()]) {
    return validMappings[period.trim()];
  }

  // Try to match by code
  if (code && validMappings[code.trim()]) {
    return validMappings[code.trim()];
  }

  // Default to permanent retention
  return { retentionPeriod: '永久', retentionCode: 'Y' };
}

/**
 * Process CSV data asynchronously
 * Updates archive records based on 档号 (archiveNo)
 */
async function processCSVData(
  importRecordId: string,
  headers: string[],
  dataRows: string[][],
  username: string,
  userId: string
): Promise<void> {
  const importRecord = await prisma.importRecord.findUnique({
    where: { id: importRecordId },
  });

  if (!importRecord) {
    console.error('[CSV Import Service] Import record not found:', importRecordId);
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const errors: { archiveNo: string; reason: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < 1) continue; // Skip empty rows

    try {
      // Create a map of header to value
      const dataMap = new Map<string, string>();
      headers.forEach((header, index) => {
        if (index < row.length) {
          dataMap.set(header, row[index]);
        }
      });

      const archiveNo = dataMap.get('档号')?.trim();
      if (!archiveNo) {
        throw new Error('档号为空');
      }

      // Find archive by archiveNo
      const archive = await prisma.archive.findUnique({
        where: { archiveNo },
      });

      if (!archive) {
        throw new Error(`档号 ${archiveNo} 不存在`);
      }

      // Prepare update data
      // Only update fields that have valid (non-empty, non-whitespace) values in CSV
      // This prevents CSV empty values from overwriting existing database values
      const updateData: any = {};

      // Map CSV columns to database fields
      // Support both variants: 部门代码/机构问题代码, 页数/页号
      if (isValidValue(dataMap.get('全宗号'))) {
        updateData.fondsNo = dataMap.get('全宗号')?.trim();
      }

      // Normalize retention period and code (only if at least one is provided)
      const retentionPeriodValue = dataMap.get('保管期限')?.trim();
      const retentionCodeValue = dataMap.get('保管期限代码')?.trim();
      if (isValidValue(retentionPeriodValue) || isValidValue(retentionCodeValue)) {
        const normalizedRetention = normalizeRetentionPeriod(retentionPeriodValue, retentionCodeValue);
        updateData.retentionPeriod = normalizedRetention.retentionPeriod;
        updateData.retentionCode = normalizedRetention.retentionCode;
      }

      if (isValidValue(dataMap.get('年度'))) {
        updateData.year = dataMap.get('年度')?.trim();
      }

      // Support both 部门代码 and 机构问题代码
      const deptCodeValue = dataMap.has('部门代码')
        ? dataMap.get('部门代码')
        : dataMap.get('机构问题代码');
      if (isValidValue(deptCodeValue)) {
        updateData.deptCode = deptCodeValue?.trim();
      }

      if (isValidValue(dataMap.get('盒号'))) {
        updateData.boxNo = dataMap.get('盒号')?.trim();
      }
      if (isValidValue(dataMap.get('件号'))) {
        updateData.pieceNo = dataMap.get('件号')?.trim();
      }
      if (isValidValue(dataMap.get('题名'))) {
        updateData.title = dataMap.get('题名')?.trim();
      }
      if (isValidValue(dataMap.get('机构问题'))) {
        updateData.deptIssue = dataMap.get('机构问题')?.trim();
      }
      if (isValidValue(dataMap.get('责任者'))) {
        updateData.responsible = dataMap.get('责任者')?.trim();
      }
      if (isValidValue(dataMap.get('文号'))) {
        updateData.docNo = dataMap.get('文号')?.trim();
      }

      // Parse and normalize date format to YYYY-MM-DD
      if (isValidValue(dataMap.get('日期'))) {
        const rawDate = dataMap.get('日期')?.trim() || '';
        const { parseAndNormalizeDate } = require('@/lib/utils/date');
        const normalizedDate = parseAndNormalizeDate(rawDate);
        if (normalizedDate) {
          updateData.date = normalizedDate;
        }
        // If parsing fails, don't update the date field (keep database value)
      }

      // Support both 页数 and 页号
      const pageNoValue = dataMap.has('页数')
        ? dataMap.get('页数')
        : dataMap.get('页号');
      if (isValidValue(pageNoValue)) {
        updateData.pageNo = pageNoValue?.trim();
      }

      if (isValidValue(dataMap.get('备注'))) {
        updateData.remark = dataMap.get('备注')?.trim();
      }

      // Support 密级 (classification level)
      if (isValidValue(dataMap.get('密级'))) {
        updateData.classificationLevel = dataMap.get('密级')?.trim();
      }

      // Update archive
      const updatedArchive = await prisma.archive.update({
        where: { archiveNo },
        data: updateData,
      });

      // Log the update
      await createLog({
        operator: username,
        operation: "modify",
        target: `CSV 更新档案: ${archiveNo} - ${updatedArchive.title || "未命名"}`,
        ip: "",
        archiveId: updatedArchive.archiveID,
        userId: userId,
      });

      // Add to Meilisearch index now that archive has complete data
      // Note: We need to fetch the full archive object for indexing
      const { indexArchive } = await import("@/services/meilisearch.service");
      indexArchive(updatedArchive).catch((err) => {
        console.error("[CSV Import Service] Failed to index archive:", err);
      });

      successCount++;
    } catch (error) {
      failCount++;
      const archiveNo = dataRows[i][headers.indexOf('档号')] || 'unknown';
      const reason = error instanceof Error ? error.message : '未知错误';
      errors.push({ archiveNo, reason });
      console.error(`[CSV Import Service] Failed to update row ${i + 1}:`, error);
    }

    // Update progress
    const processed = successCount + failCount;
    await prisma.importRecord.update({
      where: { id: importRecordId },
      data: {
        processed,
        failed: failCount,
        status: processed === dataRows.length ? "completed" : "processing",
      },
    });
  }

  // Mark as completed
  await prisma.importRecord.update({
    where: { id: importRecordId },
    data: {
      status: "completed",
      processed: dataRows.length,
      failed: failCount,
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  // Log completion
  await createLog({
    operator: username,
    operation: "csv_import_complete",
    target: `CSV 导入完成: 成功 ${successCount} 条，失败 ${failCount} 条`,
    ip: "",
    userId: userId,
  });

  console.log(`[CSV Import Service] Completed: ${successCount} success, ${failCount} failed`);
}
