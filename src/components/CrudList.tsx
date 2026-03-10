import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface CrudListProps<T> {
  items: T[];
  /** Unique key extractor */
  getKey: (item: T) => string | number;
  /** Render the content of each item row */
  renderItem: (item: T) => React.ReactNode;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => Promise<void> | void;
  loading?: boolean;
  emptyMessage?: string;
  /** Extra CSS class for each row */
  itemClassName?: string;
  /** Confirmation message shown before delete */
  deleteConfirmMessage?: string;
}

/**
 * CrudList — replaces the repeated "list items with Edit/Delete buttons + AlertDialog"
 * pattern found in Master.tsx (Prédios, Síndicos).
 */
export function CrudList<T>({
  items,
  getKey,
  renderItem,
  onEdit,
  onDelete,
  loading,
  emptyMessage = "Nenhum item cadastrado",
  itemClassName,
  deleteConfirmMessage = "Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita.",
}: CrudListProps<T>) {
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingItem || !onDelete) return;
    await onDelete(deletingItem);
    setDeletingItem(null);
  };

  if (loading) {
    return (
      <p className="text-center text-slate-500">Carregando...</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-slate-500">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div
              key={getKey(item)}
              className={cn(
                "flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50",
                itemClassName,
              )}
            >
              <div className="flex-1 min-w-0">{renderItem(item)}</div>
              <div className="flex gap-2 ml-2">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(item)}
                  >
                    Editar
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => setDeletingItem(item)}
                  >
                    Deletar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {onDelete && (
        <AlertDialog
          open={deletingItem !== null}
          onOpenChange={(open) => {
            if (!open) setDeletingItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMessage}
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Deletar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
