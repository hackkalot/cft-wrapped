import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getParticipantById } from "@/lib/db";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const participant = await getParticipantById(session.participantId);

  if (!participant) {
    return NextResponse.json(
      { error: "Participante não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: participant.id,
    name: participant.name,
    email: participant.email,
    photoUrl: participant.photo_url,
    isAdmin: session.isAdmin,
    needsRegistration: !participant.photo_url,
  });
}
