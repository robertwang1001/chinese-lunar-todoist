import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
async function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set a random SESSION_SECRET of at least 32 characters.");
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );
}
export async function seal(token: string, maxAge = 604800) {
  return new EncryptJWT({ token })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .encrypt(await key());
}
export async function token() {
  const value = (await cookies()).get("todoist_session")?.value;
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await key());
    return typeof payload.token === "string" ? payload.token : null;
  } catch {
    return null;
  }
}
export function origin() {
  return new URL(process.env.APP_URL || "http://localhost:3000").origin;
}
