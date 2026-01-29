import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// GET /api/archives - List archives with pagination and filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const userId = searchParams.get('userId'); // For filtering by user

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get archives
    const [archives, total] = await Promise.all([
      prisma.archive.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.archive.count({ where }),
    ]);

    return NextResponse.json({
      archives,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Archives GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/archives - Create a new archive
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      tags,
      fileUrl,
      fileName,
      fileSize,
      metadata,
      userId,
    } = body;

    if (!title || !fileUrl || !fileName || !fileSize) {
      return NextResponse.json(
        { error: 'Title, fileUrl, fileName, and fileSize are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create archive
    const archive = await prisma.archive.create({
      data: {
        title,
        description,
        category,
        tags: tags || [],
        fileUrl,
        fileName,
        fileSize,
        metadata,
      },
    });

    // Log creation
    await prisma.operationLog.create({
      data: {
        action: 'create',
        entityType: 'archive',
        entityId: archive.id,
        description: `Created archive: ${title}`,
        userId,
        archiveId: archive.id,
      },
    });

    return NextResponse.json({ archive }, { status: 201 });
  } catch (error) {
    console.error('[Archives POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
