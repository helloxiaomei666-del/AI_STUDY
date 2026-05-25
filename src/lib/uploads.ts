import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "@/lib/api";
import { isObjectStorageEnabled } from "@/lib/env";

const maxImageBytes = 6 * 1024 * 1024;

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new ApiError("图片格式不正确，请上传 jpg、png、webp 或 gif 图片", 400);

  const [, mimeType, base64] = match;
  const ext = mimeToExt[mimeType];
  if (!ext) throw new ApiError("仅支持 jpg、png、webp、gif 图片", 400);

  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > maxImageBytes) throw new ApiError("图片不能超过 6MB", 400);

  return { mimeType, ext, bytes };
}

export function assertValidImageDataUrl(dataUrl?: string | null) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return;
  parseImageDataUrl(dataUrl);
}

async function saveLocalImage(params: {
  dataUrl: string;
  storeId: string;
  studentId: string;
  folder: "wrong-questions";
}) {
  const { ext, bytes } = parseImageDataUrl(params.dataUrl);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const relativeDir = path.join("uploads", params.folder, params.storeId, params.studentId, month);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(absoluteDir, filename), bytes);

  return `/${relativeDir.replaceAll(path.sep, "/")}/${filename}`;
}

async function saveObjectStorageImage(): Promise<string> {
  throw new ApiError("对象存储尚未配置完成，请先设置本地存储或接入 OSS/COS/R2 上传实现", 500);
}

export async function saveImageDataUrl(params: {
  dataUrl?: string | null;
  storeId: string;
  studentId: string;
  folder: "wrong-questions";
}) {
  if (!params.dataUrl) return null;
  if (!params.dataUrl.startsWith("data:image/")) return params.dataUrl;

  if (isObjectStorageEnabled()) {
    return saveObjectStorageImage();
  }

  return saveLocalImage({
    dataUrl: params.dataUrl,
    storeId: params.storeId,
    studentId: params.studentId,
    folder: params.folder,
  });
}
