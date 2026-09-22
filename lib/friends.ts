import {
  CATEGORIAS_EXTERNAS,
  type CategoriaExterna,
  type DadosAutocadastro,
  type Friend,
  type TipoConta,
  type TipoFriend,
} from "@/types";

export function novoFriendDefaults(): Omit<Friend, "id"> {
  return {
    nome: "",
    cnpj: "",
    razaoSocial: "",
    tipo: "Empresa",
    categorias: [],
    ativo: true,
    contato: "",
    email: "",
    telefone: "",
    site: "",
    portfolio: "",
    observacoes: "",
    conta: {
      bancoCodigo: "",
      bancoNome: "",
      agencia: "",
      conta: "",
      tipoConta: "Corrente",
      pix: "",
    },
    receita: null,
  };
}

export const soDigitos = (v: string) => (v ?? "").replace(/\D/g, "");

/** 12.345.678/0001-90 — formatação progressiva, para digitar sem atrapalhar. */
export function formatCNPJ(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Validação dos dois dígitos verificadores — pega erro de digitação antes da rede. */
export function cnpjValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const dv = (base: string, pesoInicial: number) => {
    let peso = pesoInicial;
    let soma = 0;
    for (const c of base) {
      soma += Number(c) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return dv(d.slice(0, 12), 5) === Number(d[12]) && dv(d.slice(0, 13), 6) === Number(d[13]);
}

export type Alerta = { tom: "erro" | "aviso"; texto: string };

/**
 * Sinais de risco que os dados públicos já respondem — vale mais para o risco
 * real (sumir no meio do job, não emitir NF) do que consulta de processo.
 * Nada aqui bloqueia o cadastro: é informação para quem decide.
 */
export function alertasDoFriend(f: Friend): Alerta[] {
  const out: Alerta[] = [];
  const r = f.receita;

  if (f.cnpj && !cnpjValido(f.cnpj)) {
    out.push({ tom: "erro", texto: "CNPJ inválido — os dígitos verificadores não batem." });
  }
  if (!f.cnpj) {
    out.push({ tom: "aviso", texto: "Sem CNPJ. Pagamento só sai em conta PJ." });
  }
  if (!r) return out;

  if (r.situacao && r.situacao !== "ATIVA") {
    out.push({
      tom: "erro",
      texto: `Situação cadastral ${r.situacao} na Receita — não emite NF válida.`,
    });
  }

  if (r.dataAbertura) {
    const meses =
      (Date.now() - new Date(r.dataAbertura).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (meses >= 0 && meses < 6) {
      out.push({
        tom: "aviso",
        texto: `Empresa aberta há ${Math.floor(meses)} mês(es) — sem histórico.`,
      });
    }
  }

  if (!f.conta.bancoCodigo || !f.conta.conta) {
    out.push({ tom: "aviso", texto: "Conta bancária incompleta — não dá para pagar." });
  }

  return out;
}

/** Data da consulta à Receita, para o cadastro não passar dado velho por atual. */
export function consultaEnvelhecida(f: Friend, dias = 180): boolean {
  if (!f.receita?.consultadoEm) return false;
  const passados = (Date.now() - new Date(f.receita.consultadoEm).getTime()) / 86_400_000;
  return passados > dias;
}

/* ============================================================
 * Autocadastro — o que chega do formulário público
 * ========================================================== */

export const TIPOS_FRIEND: TipoFriend[] = ["Empresa", "MEI", "Freelancer PJ", "Coletivo", "Outro"];
export const TIPOS_CONTA: TipoConta[] = ["Corrente", "Poupança", "Pagamento"];

/** Link expirado ou já usado não aceita mais envio. */
export function conviteAberto(c: { status: string; expiraEm: string }, agora = Date.now()): boolean {
  if (c.status !== "pendente" && c.status !== "recebido") return false;
  const exp = new Date(c.expiraEm).getTime();
  return Number.isNaN(exp) || exp > agora;
}

/**
 * Limpa e valida o que o Friend enviou. Roda no SERVIDOR: o formulário não
 * tem login e o corpo da requisição é de quem tiver o link — nada dele entra
 * no banco sem passar por aqui (tipo, tamanho, listas fechadas).
 *
 * Os mínimos são os que tornam o cadastro pagável: CNPJ válido, conta
 * completa e um jeito de falar com a pessoa. O resto a equipe completa.
 */
export function limparAutocadastro(entrada: unknown): {
  dados: DadosAutocadastro;
  erros: string[];
} {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const conta = (e.conta && typeof e.conta === "object" ? e.conta : {}) as Record<string, unknown>;
  const txt = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const tipo = txt(e.tipo) as TipoFriend;
  const tipoConta = txt(conta.tipoConta) as TipoConta;
  const categorias = Array.isArray(e.categorias)
    ? CATEGORIAS_EXTERNAS.filter((c) => (e.categorias as unknown[]).includes(c))
    : ([] as CategoriaExterna[]);

  const dados: DadosAutocadastro = {
    nome: txt(e.nome, 120),
    cnpj: soDigitos(txt(e.cnpj, 30)).slice(0, 14),
    razaoSocial: txt(e.razaoSocial, 200),
    tipo: TIPOS_FRIEND.includes(tipo) ? tipo : "Empresa",
    categorias,
    contato: txt(e.contato, 120),
    email: txt(e.email, 160),
    telefone: txt(e.telefone, 40),
    site: txt(e.site, 300),
    portfolio: txt(e.portfolio, 300),
    observacoes: txt(e.observacoes, 2000),
    conta: {
      bancoCodigo: soDigitos(txt(conta.bancoCodigo, 5)).slice(0, 3),
      bancoNome: txt(conta.bancoNome, 120),
      agencia: txt(conta.agencia, 20),
      conta: txt(conta.conta, 30),
      tipoConta: TIPOS_CONTA.includes(tipoConta) ? tipoConta : "Corrente",
      pix: txt(conta.pix, 140),
    },
  };

  const erros: string[] = [];
  if (!dados.nome) erros.push("Informe como você quer ser chamado.");
  if (!cnpjValido(dados.cnpj)) erros.push("CNPJ inválido — confira os 14 dígitos.");
  if (!dados.contato) erros.push("Informe o nome da pessoa de contato.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) erros.push("E-mail inválido.");
  if (!dados.conta.bancoCodigo || !dados.conta.agencia || !dados.conta.conta) {
    erros.push("Conta bancária incompleta — banco, agência e conta.");
  }
  if (!dados.categorias.length) erros.push("Marque pelo menos uma entrega.");
  return { dados, erros };
}
