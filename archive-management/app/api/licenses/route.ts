import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

// GET /api/licenses - List all licenses (admin only)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Format dates and check expiration
    const formattedLicenses = licenses.map((license) => ({
      ...license,
      isActive: new Date(license.expireTime) > new Date(),
    }));

    return NextResponse.json({ licenses: formattedLicenses });
  } catch (error) {
    console.error("Failed to fetch licenses:", error);
    return NextResponse.json({ error: "获取许可证列表失败" }, { status: 500 });
  }
}

// POST /api/licenses - Create a new license (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const body = await request.json();
    const { deviceCode, authCode, expiryDays = 365 } = body;

    if (!deviceCode || !authCode) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const license = await prisma.license.create({
      data: {
        deviceCode,
        authCode,
        expiresAt,
      },
    });

    return NextResponse.json({ license, success: true });
  } catch (error) {
    console.error("Failed to create license:", error);
    return NextResponse.json({ error: "创建许可证失败" }, { status: 500 });
  }
}
