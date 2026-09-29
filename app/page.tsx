[02:25, 29/09/2026] DIALLO: "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function traiterLien() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (error) {
          setErreur(
            "Ce lien de confirmation n'est plus valable. Réessayez de vous con…
[02:40, 29/09/2026] DIALLO: "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// --- Traitement des liens de confirmation email (ne s'affiche pas au public) ---
function useConfirmationLien(): boolean | null {
  const router = useRouter();
  const [estConfirmation, setEstConfirmation] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (tokenHash && type) {
      setEstConfirmation(true);
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: type as any })
        .then(({ error }) => {
          router.replace(error ? "/connexion" : "/tableau-de-bord");
        });
    } else {
      setEstConfirmation(false);
    }
  }, [router]);

  return estConfirmation;
}

// --- Petite démonstration animée du stock en temps réel ---
function DemoStock() {
  const [quantite, setQuantite] = useState(24);
  const [dernierMouvement, setDernierMouvement] = useState<"vente" | "achat" | null>(null);
  const [caJour, setCaJour] = useState(18500);

  useEffect(() => {
    const reduireMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduireMotion) return;

    const intervalle = setInterval(() => {
      const vente = Math.random() > 0.35;
      setDernierMouvement(vente ? "vente" : "achat");
      setQuantite((q) => {
        if (vente) {
          const qte = Math.min(3, q);
          if (qte === 0) return q;
          setCaJour((ca) => ca + qte * 1000);
          return q - qte;
        }
        return Math.min(60, q + Math.ceil(Math.random() * 8) + 4);
      });
    }, 2200);
    return () => clearInterval(intervalle);
  }, []);

  const seuilBas = quantite <= 8;

  return (
    <div className="card bg-white shadow-xl shadow-ink/5 w-full max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink/50">Aperçu en direct</p>
        <span className="text-xs bg-indigo-deep/5 text-indigo-deep px-2 py-1 rounded-full">
          Savon de Karité
        </span>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-xs text-ink/50 mb-1">En stock</p>
          <p
            className={`font-display text-4xl font-bold transition-colors duration-300 ${
              seuilBas ? "text-clay" : "text-indigo-deep"
            }`}
          >
            {quantite}
          </p>
        </div>
        <div
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity duration-300 ${
            dernierMouvement === "vente"
              ? "bg-clay/10 text-clay opacity-100"
              : dernierMouvement === "achat"
              ? "bg-bronze/10 text-bronze opacity-100"
              : "opacity-0"
          }`}
        >
          {dernierMouvement === "vente" ? "− Vente" : dernierMouvement === "achat" ? "+ Entrée" : ""}
        </div>
      </div>

      {seuilBas && (
        <p className="text-xs text-clay font-medium mb-4">⚠️ Stock faible — pensez à réapprovisionner</p>
      )}

      <div className="border-t border-ink/10 pt-3 flex items-center justify-between">
        <p className="text-xs text-ink/50">Ventes du jour</p>
        <p className="font-display font-bold text-indigo-deep">
          {caJour.toLocaleString("fr-FR")} FCFA
        </p>
      </div>
    </div>
  );
}

function PageAccueil() {
  return (
    <main className="min-h-screen bg-bone">
      <section className="px-6 pt-14 pb-16 max-w-md mx-auto text-center">
        <p className="font-display text-sm tracking-wide text-bronze font-semibold mb-3">
          Diako Stock
        </p>
        <h1 className="font-display text-3xl font-bold text-indigo-deep leading-tight mb-4">
          Votre commerce, sous contrôle, à chaque instant.
        </h1>
        <p className="text-ink/60 mb-10">
          Suivez votre stock, vos ventes et vos bénéfices depuis votre téléphone —
          aussi simplement que de tenir votre cahier.
        </p>

        <DemoStock />

        <div className="mt-10 space-y-3">
          <Link href="/inscription" className="btn-primary w-full block">
            Créer mon commerce
          </Link>
          <Link
            href="/connexion"
            className="block w-full text-center py-3 text-ink/60 font-medium"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="px-6 pb-16 max-w-md mx-auto grid grid-cols-1 gap-4">
        <div className="card">
          <p className="text-2xl mb-2">📦</p>
          <h2 className="font-display font-semibold text-indigo-deep mb-1">
            Le stock se met à jour tout seul
          </h2>
          <p className="text-sm text-ink/60">
            Chaque vente diminue le stock, chaque achat l&apos;augmente — sans calcul à refaire.
          </p>
        </div>
        <div className="card">
          <p className="text-2xl mb-2">⚠️</p>
          <h2 className="font-display font-semibold text-indigo-deep mb-1">
            Alertes avant la rupture
          </h2>
          <p className="text-sm text-ink/60">
            Diako Stock vous prévient dès qu&apos;un article se fait rare.
          </p>
        </div>
        <div className="card">
          <p className="text-2xl mb-2">📊</p>
          <h2 className="font-display font-semibold text-indigo-deep mb-1">
            Vos chiffres, en clair
          </h2>
          <p className="text-sm text-ink/60">
            Ventes, bénéfices et produits qui marchent le mieux, d&apos;un coup d&apos;œil.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const estConfirmation = useConfirmationLien();

  if (estConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-ink/50">Confirmation en cours...</p>
      </main>
    );
  }
  if (estConfirmation === null) return null;

  return <PageAccueil />;
}
