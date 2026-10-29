"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser`,
    });
    setChargement(false);
    if (error) {
      setErreur("Impossible d'envoyer le lien pour le moment : " + error.message);
      return;
    }
    setEnvoye(true);
  }

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-14 pb-20 text-center rounded-b-[32px]">
        <Link href="/" className="font-display text-3xl font-bold">Diako Stock</Link>
        <p className="mt-2 text-bone/75 text-sm">Gérez votre stock. Développez votre commerce.</p>
      </header>

      <div className="px-5 -mt-12 max-w-sm mx-auto">
        <form onSubmit={envoyer} className="bg-white rounded-3xl border border-ink/10 shadow-xl shadow-ink/5 p-5 space-y-4">
          <h1 className="font-display text-xl font-bold text-indigo-deep">Mot de passe oublié</h1>
          {envoye ? (
            <p className="text-sm text-ink/80">
              Si un compte existe avec cet e-mail, vous allez recevoir un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les courriers indésirables (spam).
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/70">Entrez votre e-mail. Nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
              </div>
              {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}
              <button type="submit" disabled={chargement} className="w-full bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg disabled:opacity-50">
                {chargement ? "Envoi..." : "Envoyer le lien"}
              </button>
            </>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">
          <Link href="/connexion" className="text-bronze font-semibold">Retour à la connexion</Link>
        </p>
      </div>
    </main>
  );
}
