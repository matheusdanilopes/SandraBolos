import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { mensagemErro } from "@/lib/erros";

const BUCKET = "cardapio-fotos";
// A Vercel recusa corpos acima de ~4,5 MB antes de chegar aqui
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });

    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Apenas JPG, PNG ou WebP" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 4 MB)" }, { status: 400 });
    }

    // Os cards do carrossel têm 148px de largura; 600px cobre telas de alta
    // densidade. WebP mantém a transparência dos bolos recortados.
    const raw = Buffer.from(await file.arrayBuffer());
    const buffer = await sharp(raw)
      .rotate()
      .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const supabase = createServerSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: mensagemErro(uploadError) }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: ultima } = await supabase
      .from("cardapio_fotos")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1);
    const ordem = (ultima?.[0]?.ordem ?? 0) + 1;

    const { data: foto, error: insertError } = await supabase
      .from("cardapio_fotos")
      .insert({ url: publicUrl, storage_path: path, ordem })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: mensagemErro(insertError) }, { status: 500 });
    }

    revalidatePath("/configuracoes");
    revalidatePath("/cardapio");
    return NextResponse.json(foto, { status: 201 });
  } catch (err) {
    console.error("[cardapio-fotos] falhou:", err);
    return NextResponse.json(
      { error: mensagemErro(err, "Erro interno no servidor") },
      { status: 500 }
    );
  }
}
