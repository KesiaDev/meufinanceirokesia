import { useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDelete({ title, description, children, onConfirm, onClose }: { title: string; description: string; children?: React.ReactNode; onConfirm: () => Promise<boolean>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  async function confirm() { setBusy(true); try { if (await onConfirm()) onClose(); } finally { setBusy(false); } }
  return <AlertDialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
    {children}
    <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={confirm}>{busy ? <LoaderCircle className="animate-spin"/> : <Trash2/>}{busy ? 'Excluindo…' : 'Excluir'}</Button></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}
