import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/relatorios')({ head: () => pageHead('Relatórios de despesas', 'Relatórios privados de despesas por mês, ano e categoria, com gráficos e categorias próprias.'), loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQuery), component: () => <Workspace view="relatorios"/> });