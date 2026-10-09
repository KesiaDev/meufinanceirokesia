import { createFileRoute } from '@tanstack/react-router';
import { Workspace } from '@/components/finance/workspace';
import { workspaceQuery } from '@/lib/workspace-query';
import { pageHead } from '@/lib/finance';
export const Route = createFileRoute('/_authenticated/documentos')({ head:()=>pageHead('Meus documentos','Arquivo privado de notas, recibos e documentos originais.'), loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery), component:()=> <Workspace view="documentos"/> });
