import { NextRequest, NextResponse } from "next/server";
import { getParticipantByEmail } from "@/lib/db";
import { createSession, setSessionCookie, isAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const participant = await getParticipantByEmail(email);

    if (!participant) {
      return NextResponse.json(
        { error: "Email não encontrado na lista de participantes" },
        { status: 404 }
      );
    }

    // Check if user needs to complete registration (upload photo)
    const needsRegistration = !participant.photo_url;

    // Create session
    const token = await createSession({
      participantId: participant.id,
      email: participant.email,
      name: participant.name,
      isAdmin: isAdmin(participant.email),
      photoUrl: participant.photo_url || undefined,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        photoUrl: participant.photo_url,
        isAdmin: isAdmin(participant.email),
      },
      needsRegistration,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}
