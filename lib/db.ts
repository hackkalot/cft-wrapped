import { sql } from "@vercel/postgres";

export interface Participant {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  artist_1: string;
  artist_2: string;
  artist_3: string;
  is_admin: boolean;
  created_at: Date;
}

export interface GameSession {
  id: string;
  player_id: string;
  card_order: string[];
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
}

export interface Guess {
  id: string;
  session_id: string;
  card_participant_id: string;
  guessed_participant_id: string;
  card_index: number;
  created_at: Date;
}

// Initialize database tables
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      photo_url VARCHAR(500),
      artist_1 VARCHAR(255) NOT NULL,
      artist_2 VARCHAR(255) NOT NULL,
      artist_3 VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id UUID REFERENCES participants(id) ON DELETE CASCADE,
      card_order JSONB NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(player_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS guesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
      card_participant_id UUID REFERENCES participants(id),
      guessed_participant_id UUID REFERENCES participants(id),
      card_index INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(session_id, card_participant_id)
    )
  `;
}

// Participant functions
export async function getParticipantByEmail(
  email: string
): Promise<Participant | null> {
  const result = await sql<Participant>`
    SELECT * FROM participants WHERE LOWER(email) = LOWER(${email})
  `;
  return result.rows[0] || null;
}

export async function getParticipantById(
  id: string
): Promise<Participant | null> {
  const result = await sql<Participant>`
    SELECT * FROM participants WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

export async function getAllParticipants(): Promise<Participant[]> {
  const result = await sql<Participant>`
    SELECT * FROM participants ORDER BY name
  `;
  return result.rows;
}

export async function getParticipantsWithPhotos(): Promise<Participant[]> {
  const result = await sql<Participant>`
    SELECT * FROM participants WHERE photo_url IS NOT NULL ORDER BY name
  `;
  return result.rows;
}

export async function createParticipant(data: {
  name: string;
  email: string;
  artist_1: string;
  artist_2: string;
  artist_3: string;
  photo_url?: string;
  is_admin?: boolean;
}): Promise<Participant> {
  const result = await sql<Participant>`
    INSERT INTO participants (name, email, artist_1, artist_2, artist_3, photo_url, is_admin)
    VALUES (${data.name}, ${data.email}, ${data.artist_1}, ${data.artist_2}, ${data.artist_3}, ${data.photo_url || null}, ${data.is_admin || false})
    RETURNING *
  `;
  return result.rows[0];
}

export async function updateParticipant(
  id: string,
  data: { name?: string; photo_url?: string }
): Promise<Participant | null> {
  if (data.name && data.photo_url) {
    const result = await sql<Participant>`
      UPDATE participants SET name = ${data.name}, photo_url = ${data.photo_url}
      WHERE id = ${id} RETURNING *
    `;
    return result.rows[0] || null;
  } else if (data.name) {
    const result = await sql<Participant>`
      UPDATE participants SET name = ${data.name}
      WHERE id = ${id} RETURNING *
    `;
    return result.rows[0] || null;
  } else if (data.photo_url) {
    const result = await sql<Participant>`
      UPDATE participants SET photo_url = ${data.photo_url}
      WHERE id = ${id} RETURNING *
    `;
    return result.rows[0] || null;
  }
  return null;
}

export async function upsertParticipantFromCSV(data: {
  name: string;
  email: string;
  artist_1: string;
  artist_2: string;
  artist_3: string;
}): Promise<Participant> {
  const result = await sql<Participant>`
    INSERT INTO participants (name, email, artist_1, artist_2, artist_3)
    VALUES (${data.name}, ${data.email}, ${data.artist_1}, ${data.artist_2}, ${data.artist_3})
    ON CONFLICT (email) DO UPDATE SET
      name = ${data.name},
      artist_1 = ${data.artist_1},
      artist_2 = ${data.artist_2},
      artist_3 = ${data.artist_3}
    RETURNING *
  `;
  return result.rows[0];
}

// Game session functions
export async function getOrCreateGameSession(
  playerId: string,
  allParticipantIds: string[]
): Promise<{ session: GameSession; isNew: boolean }> {
  // Check for existing session
  const existing = await sql<GameSession>`
    SELECT * FROM game_sessions WHERE player_id = ${playerId}
  `;

  if (existing.rows[0]) {
    return { session: existing.rows[0], isNew: false };
  }

  // Create randomized card order (excluding the player)
  const otherIds = allParticipantIds.filter((id) => id !== playerId);
  const cardOrder = shuffleArray(otherIds);

  const result = await sql<GameSession>`
    INSERT INTO game_sessions (player_id, card_order)
    VALUES (${playerId}, ${JSON.stringify(cardOrder)})
    RETURNING *
  `;

  return { session: result.rows[0], isNew: true };
}

export async function getGameSession(
  playerId: string
): Promise<GameSession | null> {
  const result = await sql<GameSession>`
    SELECT * FROM game_sessions WHERE player_id = ${playerId}
  `;
  return result.rows[0] || null;
}

export async function completeGameSession(sessionId: string): Promise<void> {
  await sql`
    UPDATE game_sessions
    SET is_completed = TRUE, completed_at = NOW()
    WHERE id = ${sessionId}
  `;
}

// Guess functions
export async function saveGuess(data: {
  sessionId: string;
  cardParticipantId: string;
  guessedParticipantId: string;
  cardIndex: number;
}): Promise<Guess> {
  const result = await sql<Guess>`
    INSERT INTO guesses (session_id, card_participant_id, guessed_participant_id, card_index)
    VALUES (${data.sessionId}, ${data.cardParticipantId}, ${data.guessedParticipantId}, ${data.cardIndex})
    ON CONFLICT (session_id, card_participant_id)
    DO UPDATE SET guessed_participant_id = ${data.guessedParticipantId}
    RETURNING *
  `;
  return result.rows[0];
}

export async function getGuessesForSession(sessionId: string): Promise<Guess[]> {
  const result = await sql<Guess>`
    SELECT * FROM guesses WHERE session_id = ${sessionId} ORDER BY card_index
  `;
  return result.rows;
}

export async function removeGuess(
  sessionId: string,
  cardParticipantId: string
): Promise<void> {
  await sql`
    DELETE FROM guesses
    WHERE session_id = ${sessionId} AND card_participant_id = ${cardParticipantId}
  `;
}

// Score calculation (admin only)
export async function calculateScore(sessionId: string): Promise<number> {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM guesses
    WHERE session_id = ${sessionId}
    AND card_participant_id = guessed_participant_id
  `;
  return parseInt(result.rows[0]?.count || "0");
}

export async function getAllScores(): Promise<
  Array<{
    participant_id: string;
    name: string;
    email: string;
    photo_url: string | null;
    score: number;
    total_cards: number;
    is_completed: boolean;
    completed_at: Date | null;
  }>
> {
  const result = await sql`
    SELECT
      p.id as participant_id,
      p.name,
      p.email,
      p.photo_url,
      COALESCE(
        (SELECT COUNT(*) FROM guesses g
         WHERE g.session_id = gs.id
         AND g.card_participant_id = g.guessed_participant_id),
        0
      )::int as score,
      COALESCE(
        (SELECT COUNT(*) FROM guesses g WHERE g.session_id = gs.id),
        0
      )::int as total_cards,
      COALESCE(gs.is_completed, FALSE) as is_completed,
      gs.completed_at
    FROM participants p
    LEFT JOIN game_sessions gs ON gs.player_id = p.id
    WHERE p.photo_url IS NOT NULL
    ORDER BY score DESC, completed_at ASC
  `;
  return result.rows as Array<{
    participant_id: string;
    name: string;
    email: string;
    photo_url: string | null;
    score: number;
    total_cards: number;
    is_completed: boolean;
    completed_at: Date | null;
  }>;
}

// Utility functions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if all participants have registered with photos
export async function getRegistrationStatus(): Promise<{
  total: number;
  withPhoto: number;
  missingPhoto: number;
  allRegistered: boolean;
}> {
  const total = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM participants WHERE is_admin = FALSE
  `;

  const withPhoto = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM participants WHERE photo_url IS NOT NULL AND is_admin = FALSE
  `;

  const totalCount = parseInt(total.rows[0]?.count || "0");
  const withPhotoCount = parseInt(withPhoto.rows[0]?.count || "0");

  return {
    total: totalCount,
    withPhoto: withPhotoCount,
    missingPhoto: totalCount - withPhotoCount,
    allRegistered: totalCount > 0 && totalCount === withPhotoCount,
  };
}

// Stats for admin
export async function getGameStats(): Promise<{
  totalParticipants: number;
  registeredWithPhoto: number;
  completedGames: number;
  inProgress: number;
}> {
  const total = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM participants
  `;

  const withPhoto = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM participants WHERE photo_url IS NOT NULL
  `;

  const completed = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM game_sessions WHERE is_completed = TRUE
  `;

  const inProgress = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM game_sessions WHERE is_completed = FALSE
  `;

  return {
    totalParticipants: parseInt(total.rows[0]?.count || "0"),
    registeredWithPhoto: parseInt(withPhoto.rows[0]?.count || "0"),
    completedGames: parseInt(completed.rows[0]?.count || "0"),
    inProgress: parseInt(inProgress.rows[0]?.count || "0"),
  };
}
