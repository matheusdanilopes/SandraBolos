import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const BUCKET = "cardapio-backgrounds";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Apenas JPG/PNG são suportados" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande (máx 5 MB)" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const fileName = `bg_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
