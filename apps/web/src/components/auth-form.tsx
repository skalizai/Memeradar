"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/(auth)/actions";

type Field = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  footer,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
      ))}

      {state.error && (
        <p role="alert" className="text-sm text-down">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-up">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>

      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </form>
  );
}
