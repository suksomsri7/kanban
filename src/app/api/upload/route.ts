import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as ftp from "basic-ftp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const cardId = formData.get("cardId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const remotePath = `/kanban/${cardId}/${timestamp}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const client = new ftp.Client();
    client.ftp.verbose = false;

    await client.access({
      host: process.env.BUNNY_STORAGE_HOSTNAME!,
      user: process.env.BUNNY_STORAGE_USERNAME!,
      password: process.env.BUNNY_STORAGE_PASSWORD!,
      secure: false,
    });

    await client.ensureDir(`/kanban/${cardId}`);
    const { Readable } = await import("stream");
    const readableStream = Readable.from(buffer);
    await client.uploadFrom(readableStream, remotePath);
    client.close();

    const fileUrl = `https://${process.env.BUNNY_STORAGE_USERNAME}.b-cdn.net${remotePath}`;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
