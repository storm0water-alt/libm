import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportLogs, LogQueryParams } from "@/services/log.service";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

/**
 * GET /api/logs/export - Export logs as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const params: LogQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: {
        operation: searchParams.get("operation") || undefined,
        operator: searchParams.get("operator") || undefined,
      },
      sortBy: "time",
      sortOrder: "desc",
    };

    // Parse date range
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate) {
      params.filters.startDate = new Date(startDate);
    }

    if (endDate) {
      params.filters.endDate = new Date(endDate);
    }

    // Generate CSV
    const csv = await exportLogs(params);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="logs_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("[Logs Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 }
    );
  }
}
