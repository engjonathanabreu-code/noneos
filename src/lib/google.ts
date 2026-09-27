import 'server-only';
import {EncryptJWT, jwtDecrypt} from 'jose';
import {cookies} from 'next/headers';
import {createHash} from 'node:crypto';

// Google Calendar over OAuth. There is no none OS database, so the refresh token
// lives encrypted (A256GCM) in an httpOnly cookie on the user's browser.
export const googleCookie = 'none-google';
export const stateCookie = 'none-google-state';
export const scope = 'https://www.googleapis.com/auth/calendar.events';
const maxAge = 60*60*24*180;

export function googleConfigured(){return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;}
export function redirectUri(origin:string){return new URL('/api/google/callback', origin).toString();}

const key = () => createHash('sha256').update((process.env.NONE_SESSION_SECRET ?? '')+':google-calendar').digest();

export async function sealToken(refreshToken:string){
  return new EncryptJWT({rt:refreshToken}).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setExpirationTime('180d').setAudience('none-os-google').encrypt(key());
}
export const tokenCookieOptions = (secure:boolean) => ({httpOnly:true,secure,sameSite:'lax' as const,maxAge,path:'/'});

async function refreshToken(){
  const sealed = (await cookies()).get(googleCookie)?.value;
  if(!sealed) return null;
  try{const {payload} = await jwtDecrypt(sealed, key(), {audience:'none-os-google'}); return typeof payload.rt === 'string' ? payload.rt : null;}
  catch{return null;}
}

export async function exchangeCode(code:string, origin:string){
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,redirect_uri:redirectUri(origin),grant_type:'authorization_code'})});
  if(!r.ok) throw new Error('token exchange failed');
  const j = await r.json() as {refresh_token?:string};
  if(!j.refresh_token) throw new Error('no refresh token');
  return j.refresh_token;
}

const accessCache = new Map<string,{token:string;until:number}>();
export class GoogleNotConnected extends Error {}

async function accessToken(){
  const rt = await refreshToken();
  if(!rt) throw new GoogleNotConnected();
  const id = createHash('sha256').update(rt).digest('hex');
  const hit = accessCache.get(id);
  if(hit && hit.until > Date.now()) return hit.token;
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,refresh_token:rt,grant_type:'refresh_token'})});
  // invalid_grant: access was revoked in the Google account; treat as disconnected.
  if(r.status === 400 || r.status === 401) throw new GoogleNotConnected();
  if(!r.ok) throw new Error('refresh failed');
  const j = await r.json() as {access_token:string;expires_in:number};
  accessCache.set(id,{token:j.access_token,until:Date.now()+(j.expires_in-60)*1000});
  return j.access_token;
}

export type CalendarEvent = {id:string;title:string;start:string;end:string;allDay:boolean;link?:string;location?:string};
type GoogleEvent = {id:string;status?:string;summary?:string;htmlLink?:string;location?:string;start:{date?:string;dateTime?:string};end:{date?:string;dateTime?:string}};

export async function listEvents(timeMin:string, timeMax:string):Promise<CalendarEvent[]>{
  const token = await accessToken();
  const q = new URLSearchParams({timeMin,timeMax,singleEvents:'true',orderBy:'startTime',maxResults:'250'});
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+q,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(r.status === 401) throw new GoogleNotConnected();
  if(!r.ok) throw new Error('list failed');
  const j = await r.json() as {items?:GoogleEvent[]};
  return (j.items ?? []).filter(e=>e.status !== 'cancelled').map(e=>({
    id:e.id,title:e.summary || '(sem título)',allDay:!!e.start.date,
    start:e.start.dateTime ?? e.start.date!,end:e.end.dateTime ?? e.end.date!,
    link:e.htmlLink,location:e.location
  }));
}

// All-day event on a local date (YYYY-MM-DD).
export async function createAllDayEvent(title:string, date:string){
  const token = await accessToken();
  const next = new Date(date+'T12:00:00Z'); next.setUTCDate(next.getUTCDate()+1);
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({summary:title,start:{date},end:{date:next.toISOString().slice(0,10)},description:'Criado pelo none OS a partir do checklist.'})});
  if(r.status === 401) throw new GoogleNotConnected();
  if(!r.ok) throw new Error('create failed');
  const e = await r.json() as GoogleEvent;
  return {id:e.id,link:e.htmlLink};
}

export async function revoke(){
  const rt = await refreshToken();
  if(rt) await fetch('https://oauth2.googleapis.com/revoke?token='+encodeURIComponent(rt),{method:'POST'}).catch(()=>{});
}
