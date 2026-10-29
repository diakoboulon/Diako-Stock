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
      const m = (error.message || "").toLowerCase();
      if (m.includes("invalid login credentials")) setErreur("Email ou mot de passe incorrect.");
      else if (m.includes("not confirmed")) setErreur("Votre e-mail n'est pas encore confirmé. Ouvrez le lien reçu par e-mail.");
      else setErreur("Connexion impossible : " + error.message);
      return;
    }
    router.push("/tableau-de-bord");
  }

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-14 pb-20 text-center rounded-b-[32px]">
        <Link href="/" className="font-display text-3xl font-bold">Diako Stock</Link>
        <p className="mt-2 text-bone/75 text-sm">Gérez votre stock. Développez votre commerce.</p>
      </header>

      <div className="px-5 -mt-12 max-w-sm mx-auto">
        <form onSubmit={seConnecter} className="bg-white rounded-3xl border border-ink/10 shadow-xl shadow-ink/5 p-5 space-y-4">
          <h1 className="font-display text-xl font-bold text-indigo-deep">Bon retour 👋</h1>
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

          {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg disabled:opacity-50"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Pas encore de commerce ?{" "}
          <Link href="/inscription" className="text-bronze font-semibold">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
