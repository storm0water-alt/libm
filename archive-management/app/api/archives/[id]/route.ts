import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// GET /api/archives/[id] - Get a single archive by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Archive ID is required' },
        { status: 400 }
      );
    }

    // Fetch archive by ID
    const archive = await prisma.archive.findUnique({
      where: {
        archiveID: id,
      },
    });

    if (!archive) {
      return NextResponse.json(
        { error: 'Archive not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(archive);
  } catch (error) {
    console.error('[Archive API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch archive',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
