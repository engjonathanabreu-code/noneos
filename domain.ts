export type CompanyId = 'integral'|'mcl'|'reurb'|'ct'|'bergamota'|'vidas';
export type Area = 'financeiro'|'clientes'|'documentos'|'decisoes'|'indicadores';
export type Source = {provider:'demo'|'supabase'|'chatwoot'|'gmail'|'calendar'|'erp-crm'; externalId?:string; observedAt:string; isDemo:boolean};
export type Company = {id:CompanyId; name:string; short:string; initials:string; sector:string; type:'operacao'|'implantacao'; color:string; description:string; nextStep:string; metrics:{label:string;value:string;note:string}[]};
export type DecisionStatus = 'pending'|'approved'|'deferred'|'rejected';
export type Decision = {id:string; companyId:CompanyId; title:string; summary:string; context:string; recommendation:string; impact:string; priority:'Alta'|'Média'; due:string; source:Source};
export type DecisionRecord = {status:DecisionStatus;updatedAt:string;note:string};
export type AuditEvent = {id:string;decisionId:string;status:DecisionStatus;at:string;note:string};
export type DemoState = {version:1;decisions:Record<string,DecisionRecord>;agentRuns:Record<string,string>;audit:AuditEvent[]};
// Future adapters normalize upstream data. none does not become the system of record.
export interface CompanyRepository {list():Promise<Company[]>;get(id:CompanyId):Promise<Company|undefined>}
export interface ReadOnlyConnector {id:Source['provider'];status:'disconnected'|'connected'|'error';read(companyId:CompanyId,area:Area):Promise<{source:Source;records:unknown[]}>}
export interface ExecutiveAssistant {answer(question:string,context:{companies:Company[];decisions:Decision[]}):Promise<{text:string;sources:Source[]}>}
