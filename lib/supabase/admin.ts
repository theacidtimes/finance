import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave service_role — SÓ pode ser usado no servidor
 * (rotas de API / server actions). NUNCA importar em componente client.
 * Ignora RLS: usar apenas para operações administrativas (criar/apagar usuário).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente do servidor."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
