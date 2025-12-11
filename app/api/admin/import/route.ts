import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { upsertParticipantFromCSV, initDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { participants, initDb } = await request.json();

    // Optional: Initialize database tables
    if (initDb) {
      await initDatabase();
      return NextResponse.json({ success: true, message: "Database initialized" });
    }

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      errors: [] as string[],
    };

    for (const p of participants) {
      try {
        if (!p.name || !p.email || !p.artist_1 || !p.artist_2 || !p.artist_3) {
          results.errors.push(`Dados incompletos para: ${p.email || "sem email"}`);
          continue;
        }

        await upsertParticipantFromCSV({
          name: p.name.trim(),
          email: p.email.trim().toLowerCase(),
          artist_1: p.artist_1.trim(),
          artist_2: p.artist_2.trim(),
          artist_3: p.artist_3.trim(),
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Erro ao importar ${p.email}: ${error}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Erro ao importar dados" },
      { status: 500 }
    );
  }
}
