import { redirect } from 'next/navigation';
import { authenticated } from '@/lib/auth';
import { Cockpit } from '@/components/cockpit';
export default async function Page() { if (!await authenticated()) redirect('/entrar'); return <Cockpit/>; }
