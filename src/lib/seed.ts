import type {Company} from './domain';
// The six founding investments. Everything else about them comes from the organization registry.
export const companies:Company[]=[
 {id:'integral',name:'Integral Soluções em Engenharia',short:'Integral',initials:'IN',sector:'Engenharia',type:'operacao',color:'teal',description:'Visão executiva dos projetos, propostas e prioridades da operação de engenharia.'},
 {id:'mcl',name:'Minha Casa Legal',short:'Minha Casa Legal',initials:'MC',sector:'Regularização fundiária',type:'operacao',color:'blue',description:'Acompanhamento executivo de regularização, recebimentos e relacionamento com clientes.'},
 {id:'reurb',name:'REURB.Software',short:'REURB.Software',initials:'RE',sector:'Tecnologia',type:'operacao',color:'violet',description:'Uma visão do relacionamento comercial, adoção da plataforma e próximos passos de produto.'},
 {id:'ct',name:'CT Diego Silva',short:'CT Diego Silva',initials:'CT',sector:'Centro de treinamento',type:'operacao',color:'orange',description:'Empresa em sociedade. Estrutura preparada para futuros relatórios financeiros e de clientes.'},
 {id:'bergamota',name:'Bergamota',short:'Bergamota',initials:'BE',sector:'Confeitaria · Investimento',type:'implantacao',color:'rose',description:'Investimento em uma confeitaria, em fase de implantação. Espaço reservado para acompanhar a evolução do negócio.'},
 {id:'vidas',name:'Cartão Vidas',short:'Cartão Vidas',initials:'CV',sector:'Clube de vantagens · Investimento',type:'implantacao',color:'cyan',description:'Investimento em um clube de vantagens, em fase de implantação. Acompanhamento futuro de clientes, parceiros e resultados.'},
];
