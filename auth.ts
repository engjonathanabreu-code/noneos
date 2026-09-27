import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { timingSafeEqual, createHash } from 'node:crypto';
export const cookieName = 'none-session';
export function configured() { return !!process.env.NONE_ACCESS_KEY && (process.env.NONE_SESSION_SECRET?.length ?? 0) >= 32; }
const secret = () => new TextEncoder().encode(process.env.NONE_SESSION_SECRET);
export function validKey(input: string) {
  if (!configured()) return false;
  return timingSafeEqual(createHash('sha256').update(input).digest(), createHash('sha256').update(process.env.NONE_ACCESS_KEY!).digest());
}
export async function createSession() { return new SignJWT({role:'owner'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('8h').setAudience('none-os').setIssuer('none-os').sign(secret()); }
export async function authenticated() {
  if (!configured()) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  try { await jwtVerify(token, secret(), {audience:'none-os',issuer:'none-os',algorithms:['HS256']}); return true; } catch { return false; }
}
