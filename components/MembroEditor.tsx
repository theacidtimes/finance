"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Section, Field, TextInput, NumInput, Select } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { updateTeamMember } from "@/lib/supabase/queries";
import {
  TIPOS_CONTRATO,
  encargosPadrao,
  custoMensalCarregado,
  custoHoraCarregado,
  valorEncargos,
  somaEncargosPct,
} from "@/lib/team";
import { formatBRL, formatBRL0, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { TeamMember, TipoContrato, Encargo, TeamAnexo } from "@/types";

const BUCKET = "team-files";
type SaveStatus = "saved" | "saving" | "error";

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MembroEditor({
  initial,
  userEmail,
}: {
  initial: TeamMember;
  userEmail: string;
}) {
  const router = useRouter();
  const [m, setM] = useState<TeamMember>(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [enviando, setEnviando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readyRef = useRef(false);
  const lastSig = useRef(JSON.stringify(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof TeamMember>(k: K, v: TeamMember[K]) =>
    setM((prev) => ({ ...prev, [k]: v }));

  // autosave com debounce
  const sig = JSON.stringify(m);
  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    if (sig === lastSig.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await updateTeamMember(createClient(), m);
        lastSig.current = sig;
        setStatus("saved");
        router.refresh();
      } catch {
        setStatus("error");
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const isPJ = m.tipoContrato === "PJ";

  // --- encargos ---
  const setEncargo = (i: number, patch: Partial<Encargo>) =>
    set(
      "encargos",
      m.encargos.map((e, idx) => (idx === i ? { ...e, ...patch } : e))
    );
  const addEncargo = () => set("encargos", [...m.encargos, { label: "", pct: 0 }]);
  const removeEncargo = (i: number) =>
    set("encargos", m.encargos.filter((_, idx) => idx !== i));
  const resetEncargos = () => set("encargos", encargosPadrao(m.tipoContrato));

  const trocarContrato = (v: TipoContrato) => {
    setM((prev) => ({
      ...prev,
      tipoContrato: v,
      // sugere encargos apenas quando não havia nenhum, para não apagar edições
      encargos: prev.encargos.length === 0 ? encargosPadrao(v) : prev.encargos,
    }));
  };

  // --- anexos ---
  const salvarAnexos = async (anexos: TeamAnexo[]) => {
    const next = { ...m, anexos };
    setM(next);
    try {
      await updateTeamMember(createClient(), next);
      lastSig.current = JSON.stringify(next);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const enviarArquivo = async (file: File | undefined) => {
    if (!file) return;
    setEnviando(true);
    try {
      const supabase = createClient();
      const safe = file.name.normalize("NFD").replace(/[^\w.\-]+/g, "-");
      const path = `${m.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const anexo: TeamAnexo = {
        nome: file.name,
        path,
        size: file.size,
        tipo: file.type || "application/octet-stream",
        criadoEm: new Date().toISOString(),
      };
      await salvarAnexos([...m.anexos, anexo]);
      toast.success("Anexo enviado.");
    } catch {
      toast.error("Falha ao enviar o anexo.");
    } finally {
      setEnviando(false);
    }
  };

  const baixarAnexo = async (a: TeamAnexo) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.path, 60, { download: a.nome });
      if (error || !data) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Não foi possível abrir o anexo.");
    }
  };

  const removerAnexo = async (a: TeamAnexo) => {
    if (!confirm(`Remover "${a.nome}"?`)) return;
    try {
      const supabase = createClient();
      await supabase.storage.from(BUCKET).remove([a.path]);
      await salvarAnexos(m.anexos.filter((x) => x.path !== a.path));
      toast.success("Anexo removido.");
    } catch {
      toast.error("Falha ao remover o anexo.");
    }
  };

  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";
  const statusColor =
    status === "saving" ? "text-amber-300" : status === "error" ? "text-danger" : "text-acid";

  const custoMes = custoMensalCarregado(m);
  const custoHora = custoHoraCarregado(m);
  const th = "text-left text-[11px] uppercase tracking-widest text-muted-foreground font-medium px-2 py-2";
  const td = "px-2 py-1.5 align-middle";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push("/time")}
              className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white shrink-0"
            >
              ← Time
            </button>
            <div className="flex items-baseline gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-7 w-auto shrink-0" />
              <span className="text-xs text-neutral-300 truncate">
                {m.nome || "Nova pessoa"} · {m.funcao || "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-neutral-500 hidden lg:inline">{userEmail}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {/* Resumo de custo */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] tracking-widest uppercase text-muted-foreground">
              Custo mensal carregado
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{formatBRL0(custoMes)}</div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              salário + encargos + benefícios
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] tracking-widest uppercase text-muted-foreground">
              Custo / hora
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-acid-dark">
              {formatBRL(custoHora)}
            </div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              ÷ {m.baseHorasMes || 0} h/mês · insumo p/ orçar
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] tracking-widest uppercase text-muted-foreground">
              Encargos
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatPct(somaEncargosPct(m.encargos) / 100)}
            </div>
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {formatBRL0(valorEncargos(m))} sobre o salário
            </div>
          </div>
        </div>

        {/* Dados principais */}
        <Section title="Dados principais">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Nome"><TextInput value={m.nome} onChange={(v) => set("nome", v)} /></Field>
            <Field label="Função"><TextInput value={m.funcao} onChange={(v) => set("funcao", v)} /></Field>
            <Field label="Tipo de contrato">
              <Select
                value={m.tipoContrato}
                onChange={(v) => trocarContrato(v as TipoContrato)}
                options={TIPOS_CONTRATO}
              />
            </Field>
            <Field label="Ativo?">
              <label className="flex items-center gap-2 text-sm h-[34px]">
                <input
                  type="checkbox"
                  checked={m.ativo}
                  onChange={(e) => set("ativo", e.target.checked)}
                  className="accent-acid w-4 h-4"
                />
                {m.ativo ? "Ativo" : "Inativo"}
              </label>
            </Field>
            <Field label="Data de admissão">
              <input
                type="date"
                value={m.dataAdmissao || ""}
                onChange={(e) => set("dataAdmissao", e.target.value)}
                className="border border-input rounded-md px-2 py-1 text-sm w-full bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>
        </Section>

        {/* Custo carregado */}
        <Section title="Custo — salário, encargos e benefícios">
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <Field label={isPJ ? "Valor PJ / pró-labore (mês)" : "Salário mensal (base)"}>
              <NumInput value={m.salarioMensal} onChange={(v) => set("salarioMensal", v)} />
            </Field>
            <Field label="Base de horas / mês">
              <NumInput value={m.baseHorasMes} onChange={(v) => set("baseHorasMes", v)} />
            </Field>
            <Field label="Benefícios fixos (VR/VT/saúde) R$/mês">
              <NumInput value={m.beneficiosMensais} onChange={(v) => set("beneficiosMensais", v)} />
            </Field>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Encargo / provisão</th>
                  <th className={`${th} w-28`}>%</th>
                  <th className={`${th} w-32`}>Valor</th>
                  <th className={`${th} w-8`}></th>
                </tr>
              </thead>
              <tbody>
                {m.encargos.map((e, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className={td}>
                      <TextInput value={e.label} onChange={(v) => setEncargo(i, { label: v })} />
                    </td>
                    <td className={td}>
                      <NumInput value={e.pct} onChange={(v) => setEncargo(i, { pct: v })} />
                    </td>
                    <td className={`${td} tabular-nums text-muted-foreground`}>
                      {formatBRL0((Number(m.salarioMensal) || 0) * (Number(e.pct) || 0) / 100)}
                    </td>
                    <td className={td}>
                      <button
                        onClick={() => removeEncargo(i)}
                        className="text-muted-foreground hover:text-danger"
                        aria-label="Remover"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                {m.encargos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-xs text-muted-foreground">
                      Sem encargos (típico de PJ). Adicione se precisar provisionar algo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={addEncargo}
              className="text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-muted"
            >
              + Encargo
            </button>
            <button
              onClick={resetEncargos}
              className="text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-muted text-muted-foreground"
            >
              Restaurar padrão {m.tipoContrato}
            </button>
            <div className="ml-auto text-sm text-muted-foreground tabular-nums self-center">
              Total carregado: <b className="text-foreground">{formatBRL0(custoMes)}</b>/mês ·{" "}
              <b className="text-acid-dark">{formatBRL(custoHora)}</b>/h
            </div>
          </div>
        </Section>

        {/* Ficha cadastral */}
        <Section title="Ficha cadastral">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={isPJ ? "CNPJ" : "CPF"}>
              <TextInput value={m.cpfCnpj} onChange={(v) => set("cpfCnpj", v)} />
            </Field>
            {isPJ && (
              <Field label="Razão social">
                <TextInput value={m.razaoSocial} onChange={(v) => set("razaoSocial", v)} />
              </Field>
            )}
            <Field label="E-mail"><TextInput value={m.email} onChange={(v) => set("email", v)} /></Field>
            <Field label="Telefone"><TextInput value={m.telefone} onChange={(v) => set("telefone", v)} /></Field>
            <Field label="Chave PIX"><TextInput value={m.pix} onChange={(v) => set("pix", v)} /></Field>
            <Field label="Endereço"><TextInput value={m.endereco} onChange={(v) => set("endereco", v)} /></Field>
          </div>
          <div className="mt-4">
            <span className="text-[11px] tracking-widest uppercase text-muted-foreground">
              Observações
            </span>
            <textarea
              value={m.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
              className="mt-1 w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </Section>

        {/* Anexos / contratos */}
        <Section
          title="Contratos e anexos"
          right={
            <button
              onClick={() => fileRef.current?.click()}
              disabled={enviando}
              className="text-sm px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-80 disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "+ Anexo"}
            </button>
          }
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              enviarArquivo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {m.anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum anexo. Envie contrato, RG/CNPJ, cartão CNPJ etc. Arquivos ficam privados.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden">
              {m.anexos.map((a) => (
                <li key={a.path} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.nome}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {bytes(a.size)} · {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <button
                    onClick={() => baixarAnexo(a)}
                    className="text-xs px-2 py-1 rounded-md border border-input hover:bg-muted"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => removerAnexo(a)}
                    className="text-xs text-muted-foreground hover:text-danger px-1"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </div>
  );
}
