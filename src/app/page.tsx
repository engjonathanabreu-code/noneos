import { redirect } from 'next/navigation';
import { authenticated } from '@/lib/auth';
import { Cockpit } from '@/components/cockpit';
import { WorkspaceSync } from '@/components/workspace-sync';
export default async function Page() { if (!await authenticated()) redirect('/entrar'); return <WorkspaceSync><Cockpit/></WorkspaceSync>; }
