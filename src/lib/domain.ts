export type CompanyId = 'integral'|'mcl'|'reurb'|'ct'|'bergamota'|'vidas';
export type Company = {id:CompanyId; name:string; short:string; initials:string; sector:string; type:'operacao'|'implantacao'; color:string; description:string};
export type DecisionStatus = 'pending'|'approved'|'deferred'|'rejected';
