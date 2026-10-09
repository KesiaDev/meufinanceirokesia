import { createFileRoute } from '@tanstack/react-router';
import { AuthForm } from '@/components/finance/auth-form';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/auth')({ head:()=>pageHead('Entrar','Acesso seguro às suas finanças pessoais e documentos.'), component:AuthForm });