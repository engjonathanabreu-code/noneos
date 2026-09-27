import {NextRequest, NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {authenticated} from '@/lib/auth';
import {googleConfigured, redirectUri, scope, stateCookie} from '@/lib/google';

// Starts the Google consent flow. Only reachable with a none OS session.
export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.redirect(new URL('/entrar', req.nextUrl.origin));
  if(!googleConfigured()) return NextResponse.redirect(new URL('/?google=nao-configurado', req.nextUrl.origin));
  const state = randomBytes(24).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,redirect_uri:redirectUri(req.nextUrl.origin),response_type:'code',scope,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state}).toString();
  const res = NextResponse.redirect(url);
  // Lax so the cookie survives the top-level redirect back from Google.
  res.cookies.set(stateCookie, state, {httpOnly:true, secure:req.nextUrl.protocol==='https:', sameSite:'lax', maxAge:600, path:'/api/google'});
  return res;
}
