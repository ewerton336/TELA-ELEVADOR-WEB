import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface FieldConfig {
  name: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Extra hint under the field */
  hint?: string;
  /** Custom render — overrides the default <Input> */
  render?: (
    value: string,
    onChange: (value: string) => void,
  ) => React.ReactNode;
}

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Field definitions to render automatically */
  fields: FieldConfig[];
  /** Called with `{ [field.name]: value }` — return a promise to show loading state */
  onSubmit: (data: Record<string, string>) => Promise<void>;
  /** Initial values for edit mode */
  initialValues?: Record<string, string>;
  loading?: boolean;
}

/**
 * FormDialog — replaces the 3 identical Dialog+Form patterns in
 * Master.tsx (Prédios, Síndicos) and can be reused elsewhere.
 *
 * Renders a Dialog with Label+Input fields from `fields` config,
 * Cancel/Save buttons, and automatic loading state.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  onSubmit,
  initialValues = {},
  loading: externalLoading,
}: FormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce(
      (acc, f) => ({ ...acc, [f.name]: initialValues[f.name] ?? "" }),
      {} as Record<string, string>,
    ),
  );
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading ?? internalLoading;

  // Sync initial values when dialog opens
  React.useEffect(() => {
    if (open) {
      setValues(
        fields.reduce(
          (acc, f) => ({ ...acc, [f.name]: initialValues[f.name] ?? "" }),
          {} as Record<string, string>,
        ),
      );
    }
  }, [open, initialValues, fields]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async () => {
    setInternalLoading(true);
    try {
      await onSubmit(values);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.hint && (
                  <span className="text-sm text-slate-500 ml-2">
                    {field.hint}
                  </span>
                )}
              </Label>
              {field.render ? (
                field.render(values[field.name] ?? "", (v) =>
                  handleChange(field.name, v),
                )
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={field.disabled || loading}
                />
              )}
            </div>
          ))}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
