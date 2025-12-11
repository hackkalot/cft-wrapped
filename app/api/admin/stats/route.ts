import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!(await isAdmin(session.email))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Get top artists across all participants
    const topArtistsResult = await sql`
      SELECT artist, COUNT(*) as count FROM (
        SELECT artist_1 as artist FROM participants WHERE artist_1 IS NOT NULL AND artist_1 != ''
        UNION ALL
        SELECT artist_2 as artist FROM participants WHERE artist_2 IS NOT NULL AND artist_2 != ''
        UNION ALL
        SELECT artist_3 as artist FROM participants WHERE artist_3 IS NOT NULL AND artist_3 != ''
      ) as all_artists
      GROUP BY artist
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get score distribution
    const scoreDistributionResult = await sql`
      SELECT
        COALESCE(
          (SELECT COUNT(*) FROM guesses g
           WHERE g.session_id = gs.id
           AND g.card_participant_id = g.guessed_participant_id), 0
        ) as score,
        COUNT(*) as count
      FROM game_sessions gs
      WHERE gs.is_completed = true
      GROUP BY score
      ORDER BY score ASC
    `;

    // Get completion rate over time (by day)
    const completionByDayResult = await sql`
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as completions
      FROM game_sessions
      WHERE is_completed = true AND completed_at IS NOT NULL
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    // Get registration status breakdown (admins are also players)
    const registrationStatusResult = await sql`
      SELECT
        CASE
          WHEN photo_url IS NOT NULL THEN 'Com foto'
          ELSE 'Sem foto'
        END as status,
        COUNT(*) as count
      FROM participants
      GROUP BY CASE
          WHEN photo_url IS NOT NULL THEN 'Com foto'
          ELSE 'Sem foto'
        END
    `;

    // Get game progress breakdown (admins are also players)
    const gameProgressResult = await sql`
      SELECT status, COUNT(*) as count FROM (
        SELECT
          CASE
            WHEN gs.is_completed = true THEN 'Completo'
            WHEN gs.id IS NOT NULL THEN 'Em progresso'
            ELSE 'Não começou'
          END as status
        FROM participants p
        LEFT JOIN game_sessions gs ON gs.player_id = p.id
      ) as progress
      GROUP BY status
    `;

    return NextResponse.json({
      topArtists: topArtistsResult.rows,
      scoreDistribution: scoreDistributionResult.rows,
      completionByDay: completionByDayResult.rows,
      registrationStatus: registrationStatusResult.rows,
      gameProgress: gameProgressResult.rows,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Erro ao carregar estatísticas" },
      { status: 500 }
    );
  }
}
