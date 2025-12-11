import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllScores, getGameStats } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [scores, stats] = await Promise.all([
      getAllScores(),
      getGameStats(),
    ]);

    return NextResponse.json({ scores, stats });
  } catch (error) {
    console.error("Get scores error:", error);
    return NextResponse.json(
      { error: "Erro ao obter pontuações" },
      { status: 500 }
    );
  }
}
