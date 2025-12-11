"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check session and get current data
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.id) {
          router.push("/");
          return;
        }
        setName(data.name || "");
        if (data.photoUrl) {
          setPhotoUrl(data.photoUrl);
          setPreviewUrl(data.photoUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao fazer upload");
        setPreviewUrl("");
        return;
      }

      setPhotoUrl(data.url);
    } catch {
      setError("Erro ao fazer upload. Tenta novamente.");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoUrl) {
      setError("Por favor, faz upload da tua foto");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, photoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao guardar");
        return;
      }

      router.push("/game");
    } catch {
      setError("Erro ao guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-spotify-green"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-spotify-green mb-2">
            Completa o teu registo
          </h1>
          <p className="text-spotify-lightgray">
            Adiciona a tua foto para participar no jogo
          </p>
        </div>

        <div className="bg-spotify-gray rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full overflow-hidden bg-spotify-dark border-2 border-dashed border-gray-600 hover:border-spotify-green transition-colors cursor-pointer flex items-center justify-center"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <svg
                      className="w-10 h-10 mx-auto mb-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span className="text-xs">Foto</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <p className="mt-2 text-xs text-gray-500">
                Clica para adicionar foto
              </p>
            </div>

            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-spotify-lightgray mb-2"
              >
                Nome
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O teu nome"
                className="w-full px-4 py-3 bg-spotify-dark border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent text-white placeholder-gray-500"
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={saving || uploading || !photoUrl || !name}
              className="w-full py-3 px-4 bg-spotify-green text-black font-semibold rounded-full hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  A guardar...
                </span>
              ) : (
                "Continuar para o Jogo"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
