export function assertServerConfig() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (process.env.AI_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const aiProvider = process.env.AI_PROVIDER || "mock";
  if (!["mock", "openai"].includes(aiProvider)) {
    throw new Error("AI_PROVIDER must be either mock or openai");
  }

  const uploadProvider = process.env.UPLOAD_STORAGE_PROVIDER || "local";
  if (!["local", "oss"].includes(uploadProvider)) {
    throw new Error("UPLOAD_STORAGE_PROVIDER must be either local or oss");
  }

  if (process.env.NODE_ENV === "production") {
    if (!isAuthSecretStrong(process.env.AUTH_SECRET)) {
      throw new Error("AUTH_SECRET must be replaced with a strong secret before production deployment");
    }
  }
}

export function isObjectStorageEnabled() {
  return process.env.UPLOAD_STORAGE_PROVIDER === "oss";
}

export function isAuthSecretStrong(secret = process.env.AUTH_SECRET) {
  return Boolean(secret && secret !== "dev-secret-change-before-production" && secret.length >= 32);
}
