"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Papa from "papaparse";
import Image from "next/image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Score {
  participant_id: string;
  name: string;
  email: string;
  photo_url: string | null;
  score: number;
  total_cards: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface Stats {
  totalParticipants: number;
  registeredWithPhoto: number;
  completedGames: number;
  inProgress: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  artist_1: string;
  artist_2: string;
  artist_3: string;
  is_admin: boolean;
}

interface ChartStats {
  topArtists: Array<{ artist: string; count: number }>;
  scoreDistribution: Array<{ score: number; count: number }>;
  registrationStatus: Array<{ status: string; count: number }>;
  gameProgress: Array<{ status: string; count: number }>;
}

type Tab = "overview" | "scores" | "participants" | "import";

const COLORS = ["#E30613", "#22c55e", "#eab308", "#6366f1", "#ec4899", "#14b8a6"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [scores, setScores] = useState<Score[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartStats, setChartStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const [csvPreview, setCsvPreview] = useState<
    Array<{ name: string; email: string; artist_1: string; artist_2: string; artist_3: string }>
  >([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.id) {
          router.push("/");
          return;
        }
        if (!data.isAdmin) {
          router.push("/game");
          return;
        }
        setIsAdmin(true);
        loadData();
      });
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoresRes, participantsRes, statsRes] = await Promise.all([
        fetch("/api/admin/scores"),
        fetch("/api/admin/participants"),
        fetch("/api/admin/stats"),
      ]);
      const scoresData = await scoresRes.json();
      const participantsData = await participantsRes.json();
      const statsData = await statsRes.json();
      setScores(scoresData.scores || []);
      setStats(scoresData.stats || null);
      setParticipants(participantsData.participants || []);
      setChartStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as Array<Record<string, string>>;
        const parsed = data
          .filter((row) => row.email && row.name)
          .map((row) => ({
            name: row.name || row.Name || "",
            email: row.email || row.Email || "",
            artist_1: row.artist_1 || row.Artist1 || row["Artist 1"] || "",
            artist_2: row.artist_2 || row.Artist2 || row["Artist 2"] || "",
            artist_3: row.artist_3 || row.Artist3 || row["Artist 3"] || "",
          }));
        setCsvPreview(parsed);
        setImportResult(null);
      },
    });
  };

  const handleImport = async () => {
    if (csvPreview.length === 0) return;

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: csvPreview }),
      });

      const result = await res.json();
      setImportResult(result);
      if (result.imported > 0) {
        loadData();
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({ imported: 0, errors: ["Erro de ligação"] });
    } finally {
      setImporting(false);
    }
  };

  const handleInitDb = async () => {
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initDb: true }),
      });
      const data = await res.json();
      alert(data.message || "Base de dados inicializada!");
    } catch (error) {
      alert("Erro ao inicializar base de dados");
    }
  };

  const handleExport = (format: "csv" | "json") => {
    window.open(`/api/admin/export?format=${format}`, "_blank");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fidelidade-red"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-fidelidade-red">
              Admin Dashboard
            </h1>
            <p className="text-fidelidade-lightgray">Wrapped Guesser</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-fidelidade-lightgray hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-700">
          {(["overview", "scores", "participants", "import"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === tab
                  ? "text-fidelidade-red border-b-2 border-fidelidade-red"
                  : "text-fidelidade-lightgray hover:text-white"
              }`}
            >
              {tab === "overview"
                ? "Visão Geral"
                : tab === "scores"
                  ? "Pontuações"
                  : tab === "participants"
                    ? "Participantes"
                    : "Importar CSV"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Participantes"
                value={stats?.totalParticipants || 0}
                color="text-white"
              />
              <StatCard
                label="Registados (c/ foto)"
                value={stats?.registeredWithPhoto || 0}
                color="text-fidelidade-red"
              />
              <StatCard
                label="Jogos Completos"
                value={stats?.completedGames || 0}
                color="text-green-400"
              />
              <StatCard
                label="Em Progresso"
                value={stats?.inProgress || 0}
                color="text-yellow-400"
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Artists Chart */}
              <div className="bg-fidelidade-gray rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Top 10 Artistas</h3>
                {chartStats?.topArtists && chartStats.topArtists.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={chartStats.topArtists}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#B3B3B3" />
                      <YAxis
                        type="category"
                        dataKey="artist"
                        stroke="#B3B3B3"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#282828",
                          border: "none",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="count" fill="#E30613" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-fidelidade-lightgray text-center py-12">
                    Sem dados disponíveis
                  </p>
                )}
              </div>

              {/* Game Progress Pie Chart */}
              <div className="bg-fidelidade-gray rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Progresso do Jogo</h3>
                {chartStats?.gameProgress && chartStats.gameProgress.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartStats.gameProgress}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {chartStats.gameProgress.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#282828",
                          border: "none",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#B3B3B3" }}
                        formatter={(value) => (
                          <span style={{ color: "#B3B3B3" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-fidelidade-lightgray text-center py-12">
                    Sem dados disponíveis
                  </p>
                )}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Score Distribution */}
              <div className="bg-fidelidade-gray rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Distribuição de Pontuações
                </h3>
                {chartStats?.scoreDistribution &&
                chartStats.scoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={chartStats.scoreDistribution}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="score"
                        stroke="#B3B3B3"
                        label={{
                          value: "Pontuação",
                          position: "bottom",
                          fill: "#B3B3B3",
                        }}
                      />
                      <YAxis
                        stroke="#B3B3B3"
                        label={{
                          value: "Jogadores",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#B3B3B3",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#282828",
                          border: "none",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(value) => `Pontuação: ${value}`}
                        formatter={(value) => [`${value} jogadores`, "Total"]}
                      />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-fidelidade-lightgray text-center py-12">
                    Sem dados disponíveis
                  </p>
                )}
              </div>

              {/* Registration Status */}
              <div className="bg-fidelidade-gray rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Estado de Registo</h3>
                {chartStats?.registrationStatus &&
                chartStats.registrationStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartStats.registrationStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="status"
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {chartStats.registrationStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.status === "Com foto" ? "#22c55e" : "#ef4444"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#282828",
                          border: "none",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-fidelidade-lightgray text-center py-12">
                    Sem dados disponíveis
                  </p>
                )}
              </div>
            </div>

            {/* Init DB Button */}
            <div className="pt-4">
              <button
                onClick={handleInitDb}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Inicializar Base de Dados
              </button>
            </div>
          </motion.div>
        )}

        {/* Scores Tab */}
        {activeTab === "scores" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-end mb-4 space-x-2">
              <button
                onClick={() => handleExport("csv")}
                className="px-4 py-2 bg-fidelidade-gray text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Exportar CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="px-4 py-2 bg-fidelidade-gray text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Exportar JSON
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fidelidade-red"></div>
              </div>
            ) : (
              <div className="bg-fidelidade-gray rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-fidelidade-dark">
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Participante
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-fidelidade-lightgray">
                        Pontuação
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-fidelidade-lightgray">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-fidelidade-lightgray">
                        Conclusão
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((score, index) => (
                      <tr
                        key={score.participant_id}
                        className="border-t border-gray-700"
                      >
                        <td className="px-4 py-3 text-sm">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {score.photo_url ? (
                              <Image
                                src={score.photo_url}
                                alt={score.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600" />
                            )}
                            <div>
                              <p className="font-medium">{score.name}</p>
                              <p className="text-xs text-fidelidade-lightgray">
                                {score.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-fidelidade-red">
                            {score.score}
                          </span>
                          <span className="text-sm text-fidelidade-lightgray">
                            /{score.total_cards}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {score.is_completed ? (
                            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                              Completo
                            </span>
                          ) : score.total_cards > 0 ? (
                            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                              Em progresso
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">
                              Não começou
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-fidelidade-lightgray">
                          {score.completed_at
                            ? new Date(score.completed_at).toLocaleString(
                                "pt-PT"
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Participants Tab */}
        {activeTab === "participants" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-fidelidade-red"></div>
              </div>
            ) : (
              <div className="bg-fidelidade-gray rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-fidelidade-dark">
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Participante
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Artista 1
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Artista 2
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-fidelidade-lightgray">
                        Artista 3
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-fidelidade-lightgray">
                        Foto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant) => (
                      <tr
                        key={participant.id}
                        className="border-t border-gray-700"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {participant.photo_url ? (
                              <Image
                                src={participant.photo_url}
                                alt={participant.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600" />
                            )}
                            <div>
                              <p className="font-medium">{participant.name}</p>
                              {participant.is_admin && (
                                <span className="text-xs text-fidelidade-red">Admin</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-fidelidade-lightgray">
                          {participant.email}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {participant.artist_1 || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {participant.artist_2 || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {participant.artist_3 || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {participant.photo_url ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {participants.length === 0 && (
                  <p className="text-center py-8 text-fidelidade-lightgray">
                    Nenhum participante encontrado
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Import Tab */}
        {activeTab === "import" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-fidelidade-gray rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Importar CSV</h2>
              <p className="text-sm text-fidelidade-lightgray mb-4">
                Formato esperado: name, email, artist_1, artist_2, artist_3
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-fidelidade-dark border border-gray-600 text-white rounded-lg hover:border-fidelidade-red transition-colors"
              >
                Selecionar Ficheiro CSV
              </button>

              {csvPreview.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">
                    Preview ({csvPreview.length} participantes)
                  </h3>
                  <div className="max-h-64 overflow-auto bg-fidelidade-dark rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Artista 1</th>
                          <th className="px-3 py-2 text-left">Artista 2</th>
                          <th className="px-3 py-2 text-left">Artista 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b border-gray-800">
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 text-fidelidade-lightgray">
                              {row.email}
                            </td>
                            <td className="px-3 py-2">{row.artist_1}</td>
                            <td className="px-3 py-2">{row.artist_2}</td>
                            <td className="px-3 py-2">{row.artist_3}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.length > 10 && (
                      <p className="text-center text-xs text-gray-500 py-2">
                        ... e mais {csvPreview.length - 10}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="mt-4 px-6 py-2 bg-fidelidade-red text-black font-semibold rounded-full hover:bg-green-400 transition-colors disabled:opacity-50"
                  >
                    {importing ? "A importar..." : "Importar"}
                  </button>
                </div>
              )}

              {importResult && (
                <div className="mt-4 p-4 rounded-lg bg-fidelidade-dark">
                  <p className="text-green-400">
                    {importResult.imported} participantes importados
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-400 text-sm">Erros:</p>
                      <ul className="text-xs text-red-300 mt-1 space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-fidelidade-gray rounded-xl p-6">
      <p className="text-sm text-fidelidade-lightgray mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
