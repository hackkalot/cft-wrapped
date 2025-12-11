import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

const secretKey = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-secret-key-change-in-production-32"
);

export interface SessionPayload {
  participantId: string;
  email: string;
  name: string;
  isAdmin: boolean;
  photoUrl?: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secretKey);

  return token;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function isAdmin(email: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT is_admin FROM participants
      WHERE LOWER(email) = LOWER(${email})
    `;
    return result.rows[0]?.is_admin === true;
  } catch {
    return false;
  }
}

export function isGameOpen(): { open: boolean; message?: string } {
  const now = new Date();
  // Hardcoded dates for reliability - game runs Dec 10-20, 2025
  const start = new Date("2025-12-10T00:00:00Z");
  const end = new Date("2025-12-20T21:00:00Z");

  if (now < start) {
    return {
      open: false,
      message: `O jogo abre dia ${start.toLocaleDateString("pt-PT")} às ${start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`,
    };
  }
  if (now > end) {
    return { open: false, message: "O jogo já encerrou!" };
  }
  return { open: true };
}
