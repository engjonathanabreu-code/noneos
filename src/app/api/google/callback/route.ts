import {NextRequest, NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {exchangeCode, googleCookie, sealToken, stateCookie, tokenCookieOptions} from '@/lib/google';

// The none OS session cookie is SameSite=Strict, so it is not sent on this
// cross-site redirect from Google. The state cookie (set by /connect, which
// requires a session) is what binds this callback to an authenticated start.
// We answer with a tiny page that navigates client-side, so the next request
// is same-site and carries the session again.
function done(status:string){
  const target = '/?google='+status+'#rotina';
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><script>location.replace(${JSON.stringify(target)})</script>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

export async function GET(req:NextRequest){
  const p = req.nextUrl.searchParams;
  const expected = req.cookies.get(stateCookie)?.value ?? '';
  const got = p.get('state') ?? '';
  const valid = expected.length>0 && expected.length===got.length && timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  let res:NextResponse;
  if(!valid) res = done('estado-invalido');
  else if(p.get('error') || !p.get('code')) res = done('cancelado');
  else {
    try{
      const rt = await exchangeCode(p.get('code')!, req.nextUrl.origin);
      res = done('conectado');
      res.cookies.set(googleCookie, await sealToken(rt), tokenCookieOptions(req.nextUrl.protocol==='https:'));
    }catch{res = done('erro');}
  }
  res.cookies.set(stateCookie, '', {maxAge:0, path:'/api/google'});
  return res;
}
