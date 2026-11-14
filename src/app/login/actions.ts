"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESSAO,
  OPCOES_COOKIE_SESSAO,
  criarTokenSessao,
  destinoSeguro,
} from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export interface EstadoLogin {
  erro?: string;
}

type Conferencia = { bloqueado: boolean; login?: string; versao?: number };

/** IP de quem tenta entrar, para o limite de tentativas (a Vercel preenche estes cabeçalhos). */
async function ipDaRequisicao(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/**
 * Confere usuário e senha no banco. entrar_login (migration 018) também conta as
 * tentativas erradas e bloqueia por 15 minutos; enquanto a 018 não foi aplicada,
 * cai na verificar_login (017), sem limite de tentativas.
 */
async function conferirLogin(
  login: string,
  senha: string
): Promise<{ conferencia?: Conferencia; falhou?: unknown }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("entrar_login", {
    p_login: login,
    p_senha: senha,
    p_ip: await ipDaRequisicao(),
  });
  if (!error) return { conferencia: data as Conferencia };
  if (error.code !== "PGRST202") return { falhou: error }; // PGRST202: função não existe

  const antigo = await supabase.rpc("verificar_login", { p_login: login, p_senha: senha });
  if (antigo.error) return { falhou: antigo.error };
  return { conferencia: { bloqueado: false, login: antigo.data ?? undefined, versao: 0 } };
}

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const login = String(formData.get("login") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(String(formData.get("de") ?? ""));

  if (!login.trim() || !senha) return { erro: "Informe usuário e senha." };

  const { conferencia, falhou } = await conferirLogin(login, senha);
  if (falhou || !conferencia) {
    console.error("[login] falhou:", falhou);
    return { erro: "Não foi possível conferir o login agora. Tente novamente." };
  }
  if (conferencia.bloqueado) {
    return { erro: "Muitas tentativas erradas. Aguarde 15 minutos e tente de novo." };
  }
  if (!conferencia.login) return { erro: "Usuário ou senha incorretos." };

  const token = await criarTokenSessao(conferencia.login, conferencia.versao ?? 0);
  if (!token) return { erro: "Login indisponível: AUTH_SECRET não configurado no servidor." };

  (await cookies()).set(COOKIE_SESSAO, token, OPCOES_COOKIE_SESSAO);
  redirect(destino);
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
