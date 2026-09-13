"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type PromptDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE_DISPENSA = "sb-instalar-dispensado";
const DIAS_DE_DISPENSA = 14;

function jaDispensado(): boolean {
  try {
    const quando = Number(localStorage.getItem(CHAVE_DISPENSA));
    if (!quando) return false;
    return Date.now() - quando < DIAS_DE_DISPENSA * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Registra o service worker (requisito do Chrome para oferecer "Instalar app"
 * em vez de um atalho comum) e mostra um convite de instalação:
 * botão nativo no Android, instruções de Compartilhar → Adicionar à Tela de
 * Início no iOS, onde o Safari não expõe nenhuma API de instalação.
 */
export function InstalarApp() {
  const [prompt, setPrompt] = useState<PromptDeInstalacao | null>(null);
  const [mostrarDicaIOS, setMostrarDicaIOS] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (estaInstalado() || jaDispensado()) return;

    function aoPoderInstalar(event: Event) {
      // Sem preventDefault o Chrome mostra só a mini-infobar, que some sozinha.
      event.preventDefault();
      setPrompt(event as PromptDeInstalacao);
    }

    function aoInstalar() {
      setPrompt(null);
      setMostrarDicaIOS(false);
    }

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);

    // iOS nunca dispara beforeinstallprompt — só resta explicar o caminho manual.
    if (ehIOS()) setMostrarDicaIOS(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  function dispensar() {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    } catch {
      /* modo privado: só esconde nesta sessão */
    }
    setPrompt(null);
    setMostrarDicaIOS(false);
  }

  async function instalar() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  if (!prompt && !mostrarDicaIOS) return null;

  return (
    <div
      className="fixed left-0 right-0 z-30 px-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}
    >
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2.5 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-96.png"
          alt=""
          width={36}
          height={36}
          className="shrink-0 w-9 h-9 rounded-lg border border-gray-200"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">Instalar o app</p>
          {prompt ? (
            <p className="text-xs text-gray-500 leading-snug">Sem a barra do navegador.</p>
          ) : (
            <p className="text-xs text-gray-500 leading-snug">
              Toque em <Share size={11} className="inline align-[-1px]" aria-hidden="true" />{" "}
              e em &ldquo;Adicionar à Tela de Início&rdquo;.
            </p>
          )}
        </div>
        {prompt && (
          <button
            type="button"
            onClick={instalar}
            className="shrink-0 bg-brand-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-brand-700 active:bg-brand-800 transition-colors flex items-center gap-1.5"
          >
            <Download size={16} />
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="shrink-0 p-2 -mr-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
