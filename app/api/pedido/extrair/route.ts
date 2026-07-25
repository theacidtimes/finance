import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  FERRAMENTA,
  MODELO,
  SYSTEM_PROMPT,
  normalizarBriefing,
} from "@/lib/pedido/extrair";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Qualquer usuário autenticado pode extrair um pedido. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { userId: user.id };
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if ("error" in gate) return gate.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  let body: { texto?: string; pdfBase64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const texto = (body.texto ?? "").trim();
  const pdfBase64 = (body.pdfBase64 ?? "").trim();
  if (!texto && !pdfBase64) {
    return NextResponse.json(
      { error: "Envie o texto do e-mail ou um PDF do pedido." },
      { status: 400 }
    );
  }

  // Monta o conteúdo do usuário: PDF (document block) e/ou texto colado.
  const content: Anthropic.ContentBlockParam[] = [];
  if (pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    });
  }
  content.push({
    type: "text",
    text: texto
      ? `Extraia o pedido de orçamento a seguir e registre com a ferramenta.\n\n${texto}`
      : "Extraia o pedido de orçamento do documento anexo e registre com a ferramenta.",
  });

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: FERRAMENTA.name },
      messages: [{ role: "user", content }],
    });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!toolUse) {
      return NextResponse.json(
        { error: "A IA não retornou dados estruturados. Tente novamente." },
        { status: 502 }
      );
    }

    const dados = normalizarBriefing(toolUse.input);
    return NextResponse.json({ dados });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao extrair o pedido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
