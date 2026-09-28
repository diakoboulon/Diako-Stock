"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });
    setChargement(false);
    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/tableau-de-bord");
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-sm mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-indigo-deep">
          Diako Stock
        </h1>
        <p className="mt-2 text-ink/60">
          Gérez votre stock. Développez votre commerce.
        </p>
      </div>

      <form onSubmit={seConnecter} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            type="password"
            required
            className="input-field"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {erreur && (
          <p className="text-clay text-sm font-medium">{erreur}</p>
        )}

        <button type="submit" disabled={chargement} className="btn-primary w-full">
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Pas encore de commerce ?{" "}
        <Link href="/inscription" className="text-bronze font-semibold">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
