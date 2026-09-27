'use client';
import {useEffect,useState} from 'react';

// AI connection state reported by the server (GET /api/agentes → aiStatus()).
export type AiState = 'checking'|'conectado'|'nao_configurado'|'erro';
export const aiStateLabel:Record<AiState,string> = {checking:'Verificando IA…',conectado:'IA conectada',nao_configurado:'IA não configurada',erro:'IA indisponível'};
export function useAiStatus(){
  const [ai,setAi] = useState<AiState>('checking');
  useEffect(()=>{let alive=true;fetch('/api/agentes').then(r=>r.ok?r.json():Promise.reject()).then((d:{state?:AiState})=>{if(alive)setAi(d.state==='conectado'||d.state==='nao_configurado'||d.state==='erro'?d.state:'erro');}).catch(()=>{if(alive)setAi('erro');});return()=>{alive=false;};},[]);
  return ai;
}
