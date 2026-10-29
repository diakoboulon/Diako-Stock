"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReinitialiserPage() {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  // Le lien reçu par e-mail ouvre une session temporaire : on attend qu'elle soit prête.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPret(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => { if (session) setPret(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (mdp.length < 8) { setErreur("Le mot de passe doit avoir au moins 8 caractères."); return; }
    if (mdp !== mdp2) { setErreur("Les deux mots de passe ne sont pas identiques."); return; }
    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setChargement(false);
    if (error) { setErreur("Impossible de changer le mot de passe : " + error.message); return; }
    router.push("/tableau-de-bord");
  }

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-14 pb-20 text-center rounded-b-[32px]">
        <Link href="/" className="font-display text-3xl font-bold">Diako Stock</Link>
        <p className="mt-2 text-bone/75 text-sm">Gérez votre stock. Développez votre commerce.</p>
      </header>

      <div className="px-5 -mt-12 max-w-sm mx-auto">
        <form onSubmit={enregistrer} className="bg-white rounded-3xl border border-ink/10 shadow-xl shadow-ink/5 p-5 space-y-4">
          <h1 className="font-display text-xl font-bold text-indigo-deep">Nouveau mot de passe</h1>
          {!pret ? (
            <p className="text-sm text-ink/70">
              Ouvrez cette page depuis le lien reçu par e-mail. Si le lien a expiré, <Link href="/mot-de-passe-oublie" className="text-bronze font-semibold">demandez-en un nouveau</Link>.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
                <input type="password" required minLength={8} className="input-field" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Répétez le mot de passe</label>
                <input type="password" required minLength={8} className="input-field" value={mdp2} onChange={(e) => setMdp2(e.target.value)} />
              </div>
              {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}
              <button type="submit" disabled={chargement} className="w-full bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg disabled:opacity-50">
                {chargement ? "Enregistrement..." : "Enregistrer"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
