import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { sql } from "@vercel/postgres";

// Admin email to preserve during reset
const ADMIN_EMAIL = "diogo.serrado.pita@fidelidade.pt";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!(await isAdmin(session.email))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Get admin participant ID to preserve
    const adminResult = await sql`
      SELECT id FROM participants WHERE LOWER(email) = LOWER(${ADMIN_EMAIL})
    `;
    const adminId = adminResult.rows[0]?.id;

    // Delete all guesses
    await sql`DELETE FROM guesses`;

    // Delete all game sessions (including admin's - they can start fresh)
    await sql`DELETE FROM game_sessions`;

    // Delete all participants EXCEPT the admin
    if (adminId) {
      await sql`DELETE FROM participants WHERE id != ${adminId}`;
      // Reset admin's photo so they need to register again
      await sql`UPDATE participants SET photo_url = NULL WHERE id = ${adminId}`;
    } else {
      await sql`DELETE FROM participants`;
    }

    return NextResponse.json({
      success: true,
      message: "Base de dados limpa com sucesso. Admin preservado. Pronta para novos participantes.",
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: "Erro ao limpar base de dados" },
      { status: 500 }
    );
  }
}
