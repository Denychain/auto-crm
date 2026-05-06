"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateOrderStatus, deleteOrder } from "@/app/orders/actions";

interface OrderActionsProps {
  orderId: string;
  status: OrderStatus;
}

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      await updateOrderStatus(orderId, OrderStatus.CLOSED);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteOrder(orderId);
      router.push("/orders");
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* "Close order" — only when DONE */}
      {status === OrderStatus.DONE && (
        <Button
          onClick={handleClose}
          disabled={isPending}
          className="w-full gap-2"
          size="lg"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>🏁 Закрити замовлення</>
          )}
        </Button>
      )}

      {/* "Delete order" — always */}
      <Button
        variant="outline"
        onClick={() => setDeleteOpen(true)}
        disabled={isPending}
        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
        size="lg"
      >
        <Trash2 className="size-4" />
        Видалити замовлення
      </Button>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити замовлення?</DialogTitle>
            <DialogDescription>
              Ця дія незворотна. Усі роботи, запчастини та фото будуть
              видалені назавжди.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
              className="flex-1"
            >
              Скасувати
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Так, видалити"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
