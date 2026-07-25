"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/queries";
import { AppShell } from "@/components/AppShell";
import { PERMISSOES, type Perfil, type PermissionKey, type Permissions, type Role } from "@/types";

const roleTone: Record<Role, string> = {
  master: "bg-acid/15 text-acid-dark border-acid/30",
  gestor: "bg-blue-50 text-blue-700 border-blue-200",
};

const emptyForm = {
  nome: "",
  email: "",
  senha: "",
  role: "gestor" as Role,
  permissions: { criar_clientes: false, gerar_orcamento: false } as Permissions,
};

export function UsuariosAdmin({
  perfis,
  meuId,
  userEmail,
}: {
  perfis: Perfil[];
  meuId: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState<string | null>(null);

  const setPerm = (k: PermissionKey, v: boolean) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [k]: v } }));

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar usuário.");
      toast.success("Usuário criado.");
      setForm(emptyForm);
      setCriando(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const mudarRole = async (p: Perfil, role: Role) => {
    setBusy(p.id);
    try {
      await updateProfile(createClient(), p.id, { role });
      router.refresh();
    } catch {
      toast.error("Não foi possível alterar o papel.");
    } finally {
      setBusy(null);
    }
  };

  const togglePerm = async (p: Perfil, k: PermissionKey, v: boolean) => {
    setBusy(p.id);
    try {
      await updateProfile(createClient(), p.id, {
        permissions: { ...p.permissions, [k]: v },
      });
      router.refresh();
    } catch {
      toast.error("Não foi possível alterar a permissão.");
    } finally {
      setBusy(null);
    }
  };

  const remover = async (p: Perfil) => {
    if (!confirm(`Apagar o usuário "${p.nome || p.email}"? Esta ação não pode ser desfeita.`))
      return;
    setBusy(p.id);
    try {
      const res = await fetch(`/api/usuarios?id=${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao apagar.");
      toast.success("Usuário apagado.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const fieldCls =
    "mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppShell userEmail={userEmail}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-acid-dark" />
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle quem acessa o sistema e o que cada pessoa pode fazer. Só o master administra
            usuários.
          </p>
        </div>
        <button
          onClick={() => setCriando((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      </div>

      {criando && (
        <form
          onSubmit={criar}
          className="border border-border rounded-3xl bg-card p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Nome</span>
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className={fieldCls}
                placeholder="Nome da pessoa"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">E-mail</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={fieldCls}
                placeholder="pessoa@theacidtimes.com"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Senha provisória</span>
              <input
                type="text"
                required
                minLength={6}
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                className={fieldCls}
                placeholder="mín. 6 caracteres"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Papel</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                className={fieldCls}
              >
                <option value="gestor">Gestor</option>
                <option value="master">Master</option>
              </select>
            </label>
          </div>

          {form.role === "gestor" && (
            <div className="flex flex-wrap gap-4 pt-1">
              {PERMISSOES.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.permissions[perm.key]}
                    onChange={(e) => setPerm(perm.key, e.target.checked)}
                    className="accent-acid w-4 h-4"
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          )}
          {form.role === "master" && (
            <p className="text-xs text-muted-foreground">
              Master tem acesso total, incluindo apagar clientes e administrar usuários.
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setCriando(false);
                setForm(emptyForm);
              }}
              className="text-sm px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? "Criando…" : "Criar usuário"}
            </button>
          </div>
        </form>
      )}

      <div className="border border-border rounded-3xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3">Usuário</th>
              <th className="text-left px-4 py-3">Papel</th>
              {PERMISSOES.map((p) => (
                <th key={p.key} className="text-center px-4 py-3 hidden md:table-cell">
                  {p.label}
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {perfis.map((p) => {
              const isMaster = p.role === "master";
              const isSelf = p.id === meuId;
              const disabled = busy === p.id;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {p.nome || "—"}
                      {isSelf && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          você
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={disabled || isSelf}
                      onChange={(e) => mudarRole(p, e.target.value as Role)}
                      className={`text-[11px] px-2 py-1 rounded-full border tabular-nums disabled:opacity-60 ${roleTone[p.role]}`}
                    >
                      <option value="gestor">Gestor</option>
                      <option value="master">Master</option>
                    </select>
                  </td>
                  {PERMISSOES.map((perm) => (
                    <td key={perm.key} className="px-4 py-3 text-center hidden md:table-cell">
                      <input
                        type="checkbox"
                        className="accent-acid w-4 h-4 disabled:opacity-50"
                        checked={isMaster ? true : !!p.permissions[perm.key]}
                        disabled={isMaster || disabled}
                        onChange={(e) => togglePerm(p, perm.key, e.target.checked)}
                        title={isMaster ? "Master tem todas as permissões" : perm.desc}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isSelf && (
                      <button
                        onClick={() => remover(p)}
                        disabled={disabled}
                        className="text-xs text-muted-foreground hover:text-danger px-1.5 disabled:opacity-50"
                        title="Apagar usuário"
                      >
                        Apagar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </AppShell>
  );
}
