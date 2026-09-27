/** Contract for the future isolated, unofficial WhatsApp Web worker.
 * Session credentials must never reach the browser or Vercel public assets.
 * Deliberately no send/reply/delete/read-receipt methods.
 */
export type WhatsAppReadEvent = {eventId:string;conversationId:string;messageId:string;receivedAt:string;text:string;direction:'incoming'|'outgoing'};
export type WhatsAppReadScope = {enabled:boolean;allowedConversationIds:readonly string[];since:string};
export interface WhatsAppReadConnector {
 status():Promise<'disconnected'|'pairing'|'connected'|'paused'>;
 pause():Promise<void>;
 disconnect():Promise<void>;
}
/** Pure gate for a future authenticated ingestion endpoint. Does not connect. */
export function acceptsWhatsAppEvent(event:WhatsAppReadEvent,scope:WhatsAppReadScope):boolean {
 const time=Date.parse(event.receivedAt),since=Date.parse(scope.since);
 return scope.enabled&&scope.allowedConversationIds.includes(event.conversationId)&&Number.isFinite(time)&&Number.isFinite(since)&&time>=since&&!!event.eventId&&!!event.messageId&&typeof event.text==='string';
}
