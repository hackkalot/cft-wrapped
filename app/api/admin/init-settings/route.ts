import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!(await isAdmin(session.email))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Create game_settings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS game_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Tabela game_settings criada com sucesso",
    });
  } catch (error) {
    console.error("Error creating game_settings table:", error);
    return NextResponse.json(
      { error: "Erro ao criar tabela", details: String(error) },
      { status: 500 }
    );
  }
}
