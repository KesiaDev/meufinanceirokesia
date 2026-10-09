import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/painel')({ head:()=>pageHead('Visão geral','Seu painel privado de despesas e documentos financeiros.'), loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery), component:()=> <Workspace view="painel"/> });
