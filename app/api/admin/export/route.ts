import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllScores } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const format = request.nextUrl.searchParams.get("format") || "json";
    const scores = await getAllScores();

    if (format === "csv") {
      const csv = [
        "Nome,Email,Pontuação,Total Cards,Completo,Data Conclusão",
        ...scores.map((s) =>
          [
            s.name,
            s.email,
            s.score,
            s.total_cards,
            s.is_completed ? "Sim" : "Não",
            s.completed_at
              ? new Date(s.completed_at).toLocaleString("pt-PT")
              : "",
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="wrapped-results-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erro ao exportar dados" },
      { status: 500 }
    );
  }
}
