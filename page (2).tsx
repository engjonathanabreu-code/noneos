import { redirect } from 'next/navigation';
import { authenticated, configured } from '@/lib/auth';
import { Login } from '@/components/login';
export default async function Page() { if (await authenticated()) redirect('/'); return <Login ready={configured()}/>; }
