import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    // Insert admin user
    await sql`
      INSERT INTO participants (name, email, artist_1, artist_2, artist_3, is_admin)
      VALUES ('Diogo Pita', 'diogo.serrado.pita@fidelidade.pt', 'Admin', 'Admin', 'Admin', true)
      ON CONFLICT (email) DO UPDATE SET is_admin = true
    `;

    return NextResponse.json({
      success: true,
      message: "Admin criado! Agora faz login com diogo.serrado.pita@fidelidade.pt"
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return NextResponse.json(
      { error: "Erro ao criar admin", details: String(error) },
      { status: 500 }
    );
  }
}
