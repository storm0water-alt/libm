import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseCSVLine } from "@/services/csv-import.service";

export interface CsvValidationResult {
  success: boolean;
  step: "format" | "exist" | "ready";
  data?: {
    totalRecords: number;
    archiveNos: string[];
    emptyArchiveNos?: { row: number; index: number }[];
    duplicateArchiveNos?: { archiveNo: string; rows: number[] }[];
  };
  existCheck?: {
    total: number;
    existCount: number;
    notExistCount: number;
    notExistArchiveNos: string[];
  };
  error?: string;
}

/**
 * Parse CSV line (handles quoted fields)
 */
function parseCSVLine2(line: string): string[] {
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
 * POST /api/import/csv/validate
 *
 * Validates CSV file in two steps:
 * Step 1 (format): Validate CSV format - check for empty and duplicate archive numbers
 * Step 2 (exist): Check if archive numbers exist in database
 *
 * Request body:
 * {
 *   file: File (FormData),
 *   step: "format" | "exist",
 *   archiveNos?: string[] (for step 2)
 * }
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const step = formData.get("step") as "format" | "exist";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请选择 CSV 文件" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "文件格式错误，请上传 CSV 文件" },
        { status: 400 }
      );
    }

    // Read CSV file content
    const text = await file.text();

    // Parse CSV
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "CSV 文件为空或格式错误" },
        { status: 400 }
      );
    }

    // Parse header
    const headers = parseCSVLine2(lines[0]);

    // Validate headers - must have 档号
    if (!headers.includes("档号")) {
      return NextResponse.json(
        { success: false, error: 'CSV 文件缺少必需列："档号"' },
        { status: 400 }
      );
    }

    // Get archive number column index
    const archiveNoIndex = headers.indexOf("档号");

    // Parse data rows
    const dataRows = lines.slice(1).map((line) => parseCSVLine2(line));

    // Step 1: Format validation
    if (step === "format" || !step) {
      const archiveNos: string[] = [];
      const emptyArchiveNos: { row: number; index: number }[] = [];
      const archiveNoMap = new Map<string, number[]>();

      // Check each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        if (row.length <= archiveNoIndex) {
          // Row doesn't have archive number column
          emptyArchiveNos.push({ row: i + 2, index: i });
          continue;
        }

        const archiveNo = row[archiveNoIndex]?.trim();

        if (!archiveNo) {
          emptyArchiveNos.push({ row: i + 2, index: i });
          continue;
        }

        // Track duplicates
        if (!archiveNoMap.has(archiveNo)) {
          archiveNoMap.set(archiveNo, []);
        }
        archiveNoMap.get(archiveNo)!.push(i + 2); // +2 because header is row 1

        archiveNos.push(archiveNo);
      }

      // Find duplicates
      const duplicateArchiveNos = Array.from(archiveNoMap.entries())
        .filter(([_, rows]) => rows.length > 1)
        .map(([archiveNo, rows]) => ({ archiveNo, rows }));

      // Check if there are validation errors
      const hasErrors = emptyArchiveNos.length > 0 || duplicateArchiveNos.length > 0;

      const response: CsvValidationResult = {
        success: !hasErrors,
        step: "format",
        data: {
          totalRecords: dataRows.length,
          archiveNos,
          ...(emptyArchiveNos.length > 0 && { emptyArchiveNos }),
          ...(duplicateArchiveNos.length > 0 && { duplicateArchiveNos }),
        },
        error: hasErrors
          ? `发现 ${emptyArchiveNos.length} 个空白档号，${duplicateArchiveNos.length} 个重复档号`
          : undefined,
      };

      return NextResponse.json(response);
    }

    // Step 2: Exist validation
    if (step === "exist") {
      const archiveNosStr = formData.get("archiveNos") as string;
      if (!archiveNosStr) {
        return NextResponse.json(
          { success: false, error: "缺少档号列表" },
          { status: 400 }
        );
      }

      const archiveNos: string[] = JSON.parse(archiveNosStr);

      // Check which archive numbers exist in database
      const { prisma } = await import("@/lib/prisma");
      const existingArchives = await prisma.archive.findMany({
        where: {
          archiveNo: {
            in: archiveNos,
          },
        },
        select: {
          archiveNo: true,
        },
      });

      const existingArchiveNos = new Set(
        existingArchives.map((a) => a.archiveNo)
      );
      const notExistArchiveNos = archiveNos.filter(
        (no) => !existingArchiveNos.has(no)
      );

      const response: CsvValidationResult = {
        success: notExistArchiveNos.length === 0,
        step: "exist",
        existCheck: {
          total: archiveNos.length,
          existCount: existingArchiveNos.size,
          notExistCount: notExistArchiveNos.length,
          notExistArchiveNos,
        },
        error:
          notExistArchiveNos.length > 0
            ? `有 ${notExistArchiveNos.length} 个档号在数据库中不存在`
            : undefined,
      };

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { success: false, error: "无效的校验步骤" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[CSV Validate API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "校验失败",
      },
      { status: 500 }
    );
  }
}
