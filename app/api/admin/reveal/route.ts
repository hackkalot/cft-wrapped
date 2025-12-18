import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { getRevealDate, setRevealDate } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!(await isAdmin(session.email))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const revealDate = await getRevealDate();
    const isEnabled = revealDate ? new Date() >= new Date(revealDate) : false;

    return NextResponse.json({
      revealDate,
      isEnabled,
    });
  } catch (error) {
    console.error("Error getting reveal date:", error);
    return NextResponse.json(
      { error: "Erro ao carregar data de revelação" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!(await isAdmin(session.email))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { revealAt } = await request.json();

    await setRevealDate(revealAt || null);

    const newRevealDate = await getRevealDate();
    const isEnabled = newRevealDate ? new Date() >= new Date(newRevealDate) : false;

    return NextResponse.json({
      success: true,
      revealDate: newRevealDate,
      isEnabled,
    });
  } catch (error) {
    console.error("Error setting reveal date:", error);
    return NextResponse.json(
      { error: "Erro ao definir data de revelação" },
      { status: 500 }
    );
  }
}
