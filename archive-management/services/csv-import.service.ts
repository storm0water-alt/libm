/**
 * CSV Import Service
 *
 * Handles CSV file import to update archive information
 */

import { prisma } from "@/lib/prisma";
import { createLog } from "./log.service";

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

    // Read CSV file content
    const text = await file.text();

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
      const updateData: any = {};

      // Map CSV columns to database fields
      // Support both variants: 部门代码/机构问题代码, 页数/页号
      if (dataMap.has('全宗号')) updateData.fondsNo = dataMap.get('全宗号')?.trim();
      if (dataMap.has('保管期限')) updateData.retentionPeriod = dataMap.get('保管期限')?.trim();
      if (dataMap.has('保管期限代码')) updateData.retentionCode = dataMap.get('保管期限代码')?.trim();
      if (dataMap.has('年度')) updateData.year = dataMap.get('年度')?.trim();

      // Support both 部门代码 and 机构问题代码
      if (dataMap.has('部门代码')) {
        updateData.deptCode = dataMap.get('部门代码')?.trim();
      } else if (dataMap.has('机构问题代码')) {
        updateData.deptCode = dataMap.get('机构问题代码')?.trim();
      }

      if (dataMap.has('盒号')) updateData.boxNo = dataMap.get('盒号')?.trim();
      if (dataMap.has('件号')) updateData.pieceNo = dataMap.get('件号')?.trim();
      if (dataMap.has('题名')) updateData.title = dataMap.get('题名')?.trim();
      if (dataMap.has('机构问题')) updateData.deptIssue = dataMap.get('机构问题')?.trim();
      if (dataMap.has('责任者')) updateData.responsible = dataMap.get('责任者')?.trim();
      if (dataMap.has('文号')) updateData.docNo = dataMap.get('文号')?.trim();
      if (dataMap.has('日期')) updateData.date = dataMap.get('日期')?.trim();

      // Support both 页数 and 页号
      if (dataMap.has('页数')) {
        updateData.pageNo = dataMap.get('页数')?.trim();
      } else if (dataMap.has('页号')) {
        updateData.pageNo = dataMap.get('页号')?.trim();
      }

      if (dataMap.has('备注')) updateData.remark = dataMap.get('备注')?.trim();

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
      errors: errors.length > 0 ? errors : null,
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
