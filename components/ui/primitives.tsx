"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  children,
  right,
  className,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-5", className)}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function KPI({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[11px] tracking-widest uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "pos" && "text-acid-dark",
          tone === "neg" && "text-danger"
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  // Estado de texto local: permite apagar o campo (ficar vazio) e digitar
  // livremente sem que um "0" fixo atrapalhe. O store continua recebendo número.
  const [text, setText] = React.useState<string>(() =>
    Number.isFinite(value) ? String(value) : ""
  );

  // Sincroniza quando o valor externo muda de fato (ex.: trocar de projeto),
  // sem sobrescrever a digitação em andamento ("", "-", "1.").
  React.useEffect(() => {
    const parsed = text.trim() === "" ? NaN : Number(text);
    const same = parsed === value || (Number.isNaN(parsed) && !Number.isFinite(value));
    if (!same) setText(Number.isFinite(value) ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChange(raw.trim() === "" ? 0 : Number(raw));
      }}
      onFocus={(e) => e.currentTarget.select()}
      className={cn(
        "border border-input rounded-md px-2 py-1 text-sm tabular-nums w-full bg-card focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
      {...rest}
    />
  );
}

export function TextInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "border border-input rounded-md px-2 py-1 text-sm w-full bg-card focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
      {...rest}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("border border-input rounded-md px-2 py-1.5 text-sm w-full bg-card", className)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-widest uppercase text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
