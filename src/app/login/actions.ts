"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESSAO,
  DURACAO_SESSAO_SEGUNDOS,
  criarTokenSessao,
  destinoSeguro,
} from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export interface EstadoLogin {
  erro?: string;
}

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const login = String(formData.get("login") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(String(formData.get("de") ?? ""));

  if (!login.trim() || !senha) return { erro: "Informe usuário e senha." };

  const { data: usuario, error } = await createServerSupabaseClient().rpc("verificar_login", {
    p_login: login,
    p_senha: senha,
  });
  if (error) {
    console.error("[login] falhou:", error);
    return { erro: "Não foi possível conferir o login agora. Tente novamente." };
  }
  if (!usuario) return { erro: "Usuário ou senha incorretos." };

  const token = await criarTokenSessao(usuario);
  if (!token) return { erro: "Login indisponível: AUTH_SECRET não configurado no servidor." };

  cookies().set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect(destino);
}

export async function sair() {
  cookies().delete(COOKIE_SESSAO);
  redirect("/login");
}
