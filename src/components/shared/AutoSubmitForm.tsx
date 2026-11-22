"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

/**
 * GET form that applies filters as soon as a control changes (text inputs wait
 * for a short pause). Without JavaScript it still works through its submit button.
 */
export function AutoSubmitForm({ action, children, className }: { action: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "") params.append(k, v);
    startTransition(() => router.replace(`${action}?${params.toString()}`, { scroll: false }));
  };

  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    if (timer.current) clearTimeout(timer.current);
    const isText = (e.target as HTMLInputElement).type === "search";
    timer.current = setTimeout(apply, isText ? 400 : 0);
  };

  return (
    <form ref={ref} action={action} method="get" onChange={onChange} onSubmit={(e) => { e.preventDefault(); apply(); }} aria-busy={pending} className={className}>
      {children}
    </form>
  );
}

/**
 * Resets every control of the surrounding filter form to its "any" value and
 * re-applies it. Inputs are uncontrolled, so navigating alone would not clear them.
 */
export function ClearFiltersButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest("form");
    if (!form) return;
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox") el.checked = false;
        else if (el.type === "radio") el.checked = el.value === "";
        else if (el.type === "search" || el.type === "text") el.value = "";
      } else if (el instanceof HTMLSelectElement && el.name !== "sort") {
        el.value = "";
      }
    }
    form.requestSubmit();
  };
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
