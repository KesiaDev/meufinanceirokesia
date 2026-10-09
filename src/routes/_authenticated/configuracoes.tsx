import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/configuracoes')({ head:()=>pageHead('Minha conta','Seu perfil e suas preferências pessoais.'), loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery), component:()=> <Workspace view="configuracoes"/> });
