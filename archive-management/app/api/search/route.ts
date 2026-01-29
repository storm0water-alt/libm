import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { searchArchives } from "@/services/meilisearch.service";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

// Zod schema for search query validation
const searchQuerySchema = z.object({
  q: z.string().min(1, "搜索查询不能为空").max(500, "搜索查询过长"),
  page: z.number().int().min(1, "页码必须大于0").default(1),
  limit: z.number().int().min(1, "每页数量必须大于0").max(100, "每页最多100条").default(20),
  category: z.string().optional(),
  tags: z.string().optional(),
});

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Clean up old rate limit entries (run periodically)
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [userId, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

// GET /api/search - Search archives using Meilisearch
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // Check rate limit
    const userId = session.user.id || "anonymous";
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawData = {
      q: searchParams.get("q") || "",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      category: searchParams.get("category") || undefined,
      tags: searchParams.get("tags") || undefined,
    };

    const validationResult = searchQuerySchema.safeParse(rawData);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "请求参数无效",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Parse tags from comma-separated string
    const tags = data.tags ? data.tags.split(",").filter(Boolean) : undefined;

    // Perform search using Meilisearch service
    const results = await searchArchives(data.q, {
      limit: data.limit,
      offset: (data.page - 1) * data.limit,
      filters: {
        category: data.category,
        tags,
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[Search] Error:", error);
    return NextResponse.json(
      { error: "搜索失败，请稍后重试" },
      { status: 500 }
    );
  }
}
