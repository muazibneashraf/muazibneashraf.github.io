import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "portfolio_admin";
const SESSION_LENGTH_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.AUTH_SECRET &&
    !process.env.ADMIN_PASSWORD
  ) {
    throw new Error("Admin authentication is not configured.");
  }
  return (
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "local-portfolio-secret"
  );
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function configuredAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : "muaz-local-only";
}

export function passwordMatches(candidate: string) {
  const expected = configuredAdminPassword();
  return expected ? safeEqual(candidate, expected) : false;
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_LENGTH_SECONDS;
  const value = `admin.${expires}`;
  return `${value}.${signature(value)}`;
}

export function verifyAdminSession(token?: string | null) {
  if (!configuredAdminPassword()) return false;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expires, suppliedSignature] = parts;
  if (!role || !expires || !suppliedSignature) return false;
  const value = `${role}.${expires}`;
  if (role !== "admin" || !safeEqual(signature(value), suppliedSignature))
    return false;
  return (
    Number.isSafeInteger(Number(expires)) &&
    Number(expires) > Math.floor(Date.now() / 1000)
  );
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_LENGTH_SECONDS,
};
