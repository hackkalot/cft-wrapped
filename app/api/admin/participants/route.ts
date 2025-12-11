import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!isAdmin(session.email)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const result = await sql`
      SELECT
        id,
        name,
        email,
        photo_url,
        artist_1,
        artist_2,
        artist_3,
        is_admin,
        created_at
      FROM participants
      ORDER BY name ASC
    `;

    return NextResponse.json({ participants: result.rows });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Erro ao carregar participantes" },
      { status: 500 }
    );
  }
}
