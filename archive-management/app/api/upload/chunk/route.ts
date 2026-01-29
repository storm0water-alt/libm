import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const fileName = formData.get("fileName") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);

    if (!chunk || !fileName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await ensureUploadDir();

    // Save chunk with index in filename
    const chunkFileName = `${fileName}.part${chunkIndex}`;
    const chunkPath = join(UPLOAD_DIR, chunkFileName);

    const buffer = Buffer.from(await chunk.arrayBuffer());
    await writeFile(chunkPath, buffer);

    // If this is the last chunk, merge all chunks
    if (chunkIndex === totalChunks - 1) {
      const finalPath = join(UPLOAD_DIR, fileName);

      // Read all chunks and merge them
      const chunks: Buffer[] = [];
      let totalSize = 0;
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = join(UPLOAD_DIR, `${fileName}.part${i}`);
        const { readFile } = await import("fs/promises");
        const chunkBuffer = await readFile(chunkPath);
        chunks.push(chunkBuffer);
        totalSize += chunkBuffer.length;

        // Delete chunk file after reading
        const { unlink } = await import("fs/promises");
        await unlink(chunkPath).catch(() => {});
      }

      // Write merged file
      const mergedBuffer = Buffer.concat(chunks);
      await writeFile(finalPath, mergedBuffer);

      // Extract original filename from the unique filename
      // Format: timestamp-randomString-originalname
      const nameParts = fileName.split('-');
      const originalName = nameParts.slice(2).join('-');

      return NextResponse.json({
        success: true,
        complete: true,
        path: finalPath,
        name: originalName,
        size: totalSize,
      });
    }

    return NextResponse.json({
      success: true,
      complete: false,
      chunkIndex,
    });
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
