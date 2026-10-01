import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, useState } from 'react';
import { Button } from './ui';

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirm_label,
  onConfirm,
  pending = false,
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirm_label: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-ui bg-card-bg p-6 shadow-2xl transition-all">
          <Dialog.Title className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-foreground-muted leading-relaxed">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={destructive ? 'danger' : 'primary'}
              disabled={pending}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {confirm_label}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
