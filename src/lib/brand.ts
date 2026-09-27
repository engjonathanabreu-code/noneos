import type {LucideIcon} from 'lucide-react';
import {
  Archive,Banknote,BarChart3,Bell,Briefcase,Building2,Cake,Calculator,CalendarCheck,Camera,
  Car,CheckSquare,ClipboardList,Clock,Coffee,CreditCard,Database,Dumbbell,FilePen,FileText,
  Flag,FolderOpen,Globe,GraduationCap,Hammer,Handshake,HardHat,HeartPulse,Home,Landmark,
  Laptop,Lightbulb,Mail,Map,MapPin,Megaphone,MessageCircle,Package,Phone,PieChart,
  PiggyBank,Receipt,Rocket,Ruler,Scale,ShieldCheck,Target,TrendingUp,Users,Wallet
} from 'lucide-react';

// Checklist icon library. Keys are persisted in localStorage — never rename one.
export const checklistIcons:{key:string;label:string;Icon:LucideIcon}[] = [
  {key:'check',label:'Tarefa',Icon:CheckSquare},
  {key:'wallet',label:'Carteira',Icon:Wallet},
  {key:'banknote',label:'Dinheiro',Icon:Banknote},
  {key:'receipt',label:'Recibo',Icon:Receipt},
  {key:'credit-card',label:'Cartão',Icon:CreditCard},
  {key:'piggy-bank',label:'Reserva',Icon:PiggyBank},
  {key:'landmark',label:'Banco',Icon:Landmark},
  {key:'calculator',label:'Cálculo',Icon:Calculator},
  {key:'trending-up',label:'Crescimento',Icon:TrendingUp},
  {key:'bar-chart',label:'Relatório',Icon:BarChart3},
  {key:'pie-chart',label:'Participação',Icon:PieChart},
  {key:'target',label:'Meta',Icon:Target},
  {key:'file-text',label:'Documento',Icon:FileText},
  {key:'file-pen',label:'Contrato',Icon:FilePen},
  {key:'clipboard',label:'Lista',Icon:ClipboardList},
  {key:'folder',label:'Pasta',Icon:FolderOpen},
  {key:'archive',label:'Arquivo',Icon:Archive},
  {key:'scale',label:'Jurídico',Icon:Scale},
  {key:'shield',label:'Segurança',Icon:ShieldCheck},
  {key:'database',label:'Sistema',Icon:Database},
  {key:'laptop',label:'Computador',Icon:Laptop},
  {key:'globe',label:'Site',Icon:Globe},
  {key:'mail',label:'E-mail',Icon:Mail},
  {key:'message',label:'Mensagem',Icon:MessageCircle},
  {key:'phone',label:'Ligação',Icon:Phone},
  {key:'megaphone',label:'Marketing',Icon:Megaphone},
  {key:'camera',label:'Conteúdo',Icon:Camera},
  {key:'users',label:'Equipe',Icon:Users},
  {key:'handshake',label:'Parceria',Icon:Handshake},
  {key:'briefcase',label:'Negócio',Icon:Briefcase},
  {key:'building',label:'Empresa',Icon:Building2},
  {key:'home',label:'Imóvel',Icon:Home},
  {key:'map-pin',label:'Local',Icon:MapPin},
  {key:'map',label:'Mapa',Icon:Map},
  {key:'ruler',label:'Medição',Icon:Ruler},
  {key:'hard-hat',label:'Obra',Icon:HardHat},
  {key:'hammer',label:'Manutenção',Icon:Hammer},
  {key:'package',label:'Estoque',Icon:Package},
  {key:'car',label:'Visita',Icon:Car},
  {key:'cake',label:'Confeitaria',Icon:Cake},
  {key:'coffee',label:'Reunião',Icon:Coffee},
  {key:'dumbbell',label:'Treino',Icon:Dumbbell},
  {key:'heart-pulse',label:'Saúde',Icon:HeartPulse},
  {key:'graduation',label:'Capacitação',Icon:GraduationCap},
  {key:'calendar',label:'Agenda',Icon:CalendarCheck},
  {key:'clock',label:'Prazo',Icon:Clock},
  {key:'bell',label:'Lembrete',Icon:Bell},
  {key:'flag',label:'Marco',Icon:Flag},
  {key:'lightbulb',label:'Ideia',Icon:Lightbulb},
  {key:'rocket',label:'Lançamento',Icon:Rocket}
];

export function checklistIcon(key?:string){return (checklistIcons.find(i=>i.key===key)??checklistIcons[0]).Icon;}

// Company colors. Mid-tone hues that hold contrast on white and as a 14% tint.
export const companyPalette:{hex:string;label:string}[] = [
  {hex:'#08785d',label:'Verde none'},{hex:'#0f766e',label:'Petróleo'},{hex:'#0e7490',label:'Ciano'},
  {hex:'#2563eb',label:'Azul'},{hex:'#4f46e5',label:'Índigo'},{hex:'#7c3aed',label:'Violeta'},
  {hex:'#c026d3',label:'Magenta'},{hex:'#db2777',label:'Rosa'},{hex:'#dc2626',label:'Vermelho'},
  {hex:'#ea580c',label:'Laranja'},{hex:'#ca8a04',label:'Mostarda'},{hex:'#65a30d',label:'Lima'},
  {hex:'#57534e',label:'Grafite'},{hex:'#1e293b',label:'Noturno'}
];
export const paletteHexes = companyPalette.map(c=>c.hex);

const defaults:Record<string,string> = {integral:'#0f766e',mcl:'#2563eb',reurb:'#7c3aed',ct:'#ea580c',bergamota:'#db2777',vidas:'#0e7490'};
export function companyColor(org?:{id:string;color?:string}){
  if(!org) return companyPalette[0].hex;
  if(org.color && paletteHexes.includes(org.color)) return org.color;
  return defaults[org.id] ?? paletteHexes[[...org.id].reduce((n,c)=>n+c.charCodeAt(0),0) % paletteHexes.length];
}

// Built-in vector logos (public/logos). A logo uploaded in the organization form takes precedence.
const builtInLogos:Record<string,string> = {ct:'/logos/ct-diego-silva.svg'};
export function organizationLogo(o:{id:string;logo?:string}){return o.logo || builtInLogos[o.id] || '';}
