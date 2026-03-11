import path from "path";
import { mkdir, writeFile, unlink, rm } from "fs/promises";

function isBunny(): boolean {
  return !!(
    process.env.BUNNY_STORAGE_HOSTNAME &&
    process.env.BUNNY_STORAGE_USERNAME &&
    process.env.BUNNY_STORAGE_PASSWORD
  );
}

async function getBunnyClient() {
  const ftp = await import("basic-ftp");
  const client = new ftp.Client();
  client.ftp.verbose = false;
  await client.access({
    host: process.env.BUNNY_STORAGE_HOSTNAME!,
    user: process.env.BUNNY_STORAGE_USERNAME!,
    password: process.env.BUNNY_STORAGE_PASSWORD!,
    secure: false,
  });
  return client;
}

const UPLOAD_DIR = () => process.env.UPLOAD_DIR || "./uploads";

// ─── Upload ────────────────────────────────────────────

export async function uploadFile(
  cardId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const remotePath = `/kanban/${cardId}/${timestamp}_${safeName}`;

  if (isBunny()) {
    const client = await getBunnyClient();
    await client.ensureDir(`/kanban/${cardId}`);
    const { Readable } = await import("stream");
    await client.uploadFrom(Readable.from(buffer), remotePath);
    client.close();
    return `https://${process.env.BUNNY_STORAGE_USERNAME}.b-cdn.net${remotePath}`;
  }

  const fullPath = path.join(UPLOAD_DIR(), remotePath.slice(1));
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return `/api/uploads${remotePath}`;
}

// ─── Delete single file ────────────────────────────────

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl) return;

  if (isBunny()) {
    const cdnPrefix = `https://${process.env.BUNNY_STORAGE_USERNAME}.b-cdn.net`;
    if (fileUrl.startsWith(cdnPrefix)) {
      const client = await getBunnyClient();
      try {
        await client.remove(fileUrl.replace(cdnPrefix, ""));
      } catch { /* file may not exist */ }
      client.close();
    }
    return;
  }

  const relativePath = fileUrl.replace(/^\/api\/uploads\//, "");
  try {
    await unlink(path.join(UPLOAD_DIR(), relativePath));
  } catch { /* file may not exist */ }
}

// ─── Delete all files for a list of cards ──────────────

export async function deleteBrandFiles(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return;

  if (isBunny()) {
    const client = await getBunnyClient();
    for (const cardId of cardIds) {
      try {
        await client.removeDir(`/kanban/${cardId}`);
      } catch { /* directory may not exist */ }
    }
    client.close();
    return;
  }

  for (const cardId of cardIds) {
    try {
      await rm(path.join(UPLOAD_DIR(), "kanban", cardId), { recursive: true, force: true });
    } catch { /* directory may not exist */ }
  }
}
