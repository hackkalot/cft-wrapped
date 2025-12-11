import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!isAdmin(session.email)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Delete all data in the correct order (due to foreign keys)
    await sql`DELETE FROM guesses`;
    await sql`DELETE FROM game_sessions`;
    await sql`DELETE FROM participants`;

    return NextResponse.json({
      success: true,
      message: "Base de dados limpa com sucesso. Pronta para novos participantes.",
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "Erro ao limpar base de dados" },
      { status: 500 }
    );
  }
}
