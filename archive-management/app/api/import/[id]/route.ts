import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

// GET /api/import/[id] - Get import status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    const importRecord = await prisma.importRecord.findUnique({
      where: { id },
    });

    if (!importRecord) {
      return NextResponse.json({ error: "导入记录不存在" }, { status: 404 });
    }

    return NextResponse.json(importRecord);
  } catch (error) {
    console.error("[Import GET] Error:", error);
    return NextResponse.json({ error: "获取导入状态失败" }, { status: 500 });
  }
}
