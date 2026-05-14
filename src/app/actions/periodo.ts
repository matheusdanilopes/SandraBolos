"use server";

import { cookies } from "next/headers";
import { isValidPreset, type PeriodoPreset } from "@/lib/periodo";

export async function setPeriodoCookie(
  preset: string,
  de?: string,
  ate?: string
) {
  const cookieStore = cookies();
  const validPreset: PeriodoPreset = isValidPreset(preset) ? preset : "mes_atual";
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365 };

  cookieStore.set("sb_periodo", validPreset, opts);

  if (validPreset === "personalizado" && de && ate) {
    cookieStore.set("sb_periodo_de", de, opts);
    cookieStore.set("sb_periodo_ate", ate, opts);
  } else {
    cookieStore.delete("sb_periodo_de");
    cookieStore.delete("sb_periodo_ate");
  }
}
