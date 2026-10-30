import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/ganhos')({ head:()=>pageHead('Ganhos','Salário, pensões e o quanto sobra no mês.'), loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery), component:()=> <Workspace view="ganhos"/> });
