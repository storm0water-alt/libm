import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportConfigs } from "@/services/config.service";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

/**
 * GET /api/config/export
 *
 * Export all configurations as CSV file
 *
 * Authentication: Admin only
 *
 * Response: CSV file download
 *
 * @example
 * GET /api/config/export
 * -> Downloads config-export-20240126.csv
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    // Export configs
    const configs = await exportConfigs();

    // Generate CSV content
    const csvHeaders = ["配置键", "配置值", "配置类型", "描述", "分组"];
    const csvRows = configs.map((config) => [
      config.configKey,
      config.configValue,
      config.configType,
      config.description || "",
      config.group,
    ]);

    // Escape CSV values
    const escapeCsv = (value: string): string => {
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV string
    const csvContent = [
      csvHeaders.map(escapeCsv).join(","),
      ...csvRows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `config-export-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Config Export API] Failed to export configs:", error);
    return NextResponse.json(
      { error: "导出配置失败" },
      { status: 500 }
    );
  }
}
