"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESSAO,
  DURACAO_SESSAO_SEGUNDOS,
  criarTokenSessao,
  destinoSeguro,
  validarCredenciais,
} from "@/lib/auth";

export interface EstadoLogin {
  erro?: string;
}

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const login = String(formData.get("login") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(String(formData.get("de") ?? ""));

  const usuario = validarCredenciais(login, senha);
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
