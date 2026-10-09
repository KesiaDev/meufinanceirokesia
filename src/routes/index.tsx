import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from '@/components/finance/auth-form';
import { pageHead } from '@/lib/finance';

export const Route = createFileRoute("/")({
  head: () => pageHead('Meu Financeiro IA', 'Organização financeira pessoal, despesas da Rebeca e documentos privados.'),
  component: AuthForm,
});

