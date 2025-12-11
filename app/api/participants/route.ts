import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllParticipants, updateParticipant, getParticipantsWithPhotos, getRegistrationStatus } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("all") === "true";

    if (includeAll) {
      // Return all participants (for waiting screen)
      // Admins are also players, so include everyone
      const allParticipants = await getAllParticipants();
      const registrationStatus = await getRegistrationStatus();

      const sanitizedParticipants = allParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photo_url,
        hasPhoto: !!p.photo_url,
      }));

      return NextResponse.json({
        participants: sanitizedParticipants,
        registrationStatus,
      });
    }

    // For game, only return participants with photos (registered)
    const participants = await getParticipantsWithPhotos();

    // Don't expose artists for non-admin users
    const sanitizedParticipants = participants.map((p) => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
    }));

    return NextResponse.json({ participants: sanitizedParticipants });
  } catch (error) {
    console.error("Get participants error:", error);
    return NextResponse.json(
      { error: "Erro ao obter participantes" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { name, photoUrl } = await request.json();

    const updated = await updateParticipant(session.participantId, {
      name,
      photo_url: photoUrl,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Erro ao atualizar perfil" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: updated.id,
        name: updated.name,
        photoUrl: updated.photo_url,
      },
    });
  } catch (error) {
    console.error("Update participant error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar participante" },
      { status: 500 }
    );
  }
}

// Admin only - get all participants with full data
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const participants = await getAllParticipants();

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("Admin get participants error:", error);
    return NextResponse.json(
      { error: "Erro ao obter participantes" },
      { status: 500 }
    );
  }
}
