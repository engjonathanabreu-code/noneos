import type {ReadOnlyConnector,CompanyId,Area,CompanyRepository} from './domain';
import {companies} from './demo';
// Local prototype adapter. Swap through server-side dependency injection later.
export const demoCompanyRepository:CompanyRepository={
 async list(){return companies;},
 async get(id){return companies.find(c=>c.id===id);}
};
export class ConnectorNotConfiguredError extends Error {
 constructor(provider:string){super(`${provider}: integração não configurada`);this.name='ConnectorNotConfiguredError';}
}
export function disconnectedConnector(id:ReadOnlyConnector['id']):ReadOnlyConnector {
 return {id,status:'disconnected',async read(_companyId:CompanyId,_area:Area){throw new ConnectorNotConfiguredError(id);}};
}
// Disconnected never masquerades as an empty successful synchronization.
export const plannedConnectors = {
 supabase:disconnectedConnector('supabase'),chatwoot:disconnectedConnector('chatwoot'),
 gmail:disconnectedConnector('gmail'),calendar:disconnectedConnector('calendar'),
 erpCrm:disconnectedConnector('erp-crm')
};
