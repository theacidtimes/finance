import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getMeuPerfil } from "@/lib/supabase/queries";
import { FERRAMENTA, MODELO, SYSTEM_PROMPT, normalizarCronoExtraido } from "@/lib/crono-extrair";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIPOS = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
type Tipo = (typeof TIPOS)[number];

/**
 * Lê um cronograma em PDF ou imagem e devolve no formato do app.
 * Aberta também ao perfil produção — é a ferramenta do GP. Não grava nada:
 * quem aplica é a tela, depois da confirmação.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!(await getMeuPerfil(supabase))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  let body: { arquivoBase64?: string; tipo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const dados = (body.arquivoBase64 ?? "").trim();
  const tipo = body.tipo as Tipo;
  if (!dados || !TIPOS.includes(tipo)) {
    return NextResponse.json({ error: "Envie um PDF ou uma imagem (PNG/JPG) do cronograma." }, { status: 400 });
  }

  const anexo: Anthropic.ContentBlockParam =
    tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: tipo, data: dados } }
      : { type: "image", source: { type: "base64", media_type: tipo, data: dados } };

  try {
    const msg = await new Anthropic({ apiKey }).messages.create({
      model: MODELO,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: FERRAMENTA.name },
      messages: [
        {
          role: "user",
          content: [anexo, { type: "text", text: "Transcreva o cronograma anexo com a ferramenta." }],
        },
      ],
    });
    const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const resultado = toolUse ? normalizarCronoExtraido(toolUse.input) : null;
    if (!resultado) {
      return NextResponse.json(
        { error: "Não encontrei um cronograma nesse arquivo. Confira se é a tabela de tarefas." },
        { status: 422 }
      );
    }
    return NextResponse.json(resultado);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao ler o cronograma.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
