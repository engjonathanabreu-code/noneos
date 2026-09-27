import './checklists.css';
import './organizations.css';
import './whatsapp.css';
import {MotionFeedback} from '@/components/motion-feedback';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './agents.css';
export const metadata: Metadata = {title:'none · Seu espaço de decisão',description:'Workspace privado da holding none',robots:{index:false,follow:false}};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#064f42'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}<MotionFeedback/></body></html>; }

import './brainstorm.css';

import './motion.css';

import './device-polish.css';

import './ui.css';
