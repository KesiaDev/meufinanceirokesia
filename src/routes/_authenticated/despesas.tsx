import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/despesas')({ head:()=>pageHead('Despesas','Seus registros financeiros e pagamentos confirmados.'), loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery), component:()=> <Workspace view="despesas"/> });
