import { createFileRoute } from '@tanstack/react-router';
import { AuthForm } from '@/components/finance/auth-form';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/reset-password')({ head:()=>pageHead('Redefinir senha','Recupere com segurança o acesso à sua conta.'), component:()=> <AuthForm recovery/> });