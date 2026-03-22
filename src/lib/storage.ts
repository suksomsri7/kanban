import path from "path";
import { mkdir, writeFile, unlink, rm, readdir, stat } from "fs/promises";

const UPLOAD_DIR = () => process.env.UPLOAD_DIR || "./uploads";

// Folder structure:
//   uploads/
//     cards/{cardId}/
//       {timestamp}_{filename}

export async function uploadFile(
  cardId: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relative = `cards/${cardId}/${timestamp}_${safeName}`;

  const fullPath = path.join(UPLOAD_DIR(), relative);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  return `/api/uploads/${relative}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl) return;
  const relative = fileUrl.replace(/^\/api\/uploads\//, "");
  try {
    await unlink(path.join(UPLOAD_DIR(), relative));
  } catch { /* file may not exist */ }
}

export async function deleteCardFiles(cardId: string): Promise<void> {
  if (!cardId) return;
  const dir = path.join(UPLOAD_DIR(), "cards", cardId);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch { /* directory may not exist */ }
}

export async function deleteMultipleCardFiles(cardIds: string[]): Promise<void> {
  for (const cardId of cardIds) {
    await deleteCardFiles(cardId);
  }
}

export async function listCardFiles(cardId: string): Promise<string[]> {
  const dir = path.join(UPLOAD_DIR(), "cards", cardId);
  try {
    const files = await readdir(dir);
    return files.map((f) => `/api/uploads/cards/${cardId}/${f}`);
  } catch {
    return [];
  }
}
