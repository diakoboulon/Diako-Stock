"use client";

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
      <section className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-12 pb-24 text-center rounded-b-[36px]">
        <div className="max-w-md mx-auto">
          <p className="font-display text-sm tracking-widest text-bronze font-semibold mb-3">DIAKO STOCK</p>
          <h1 className="font-display text-[32px] font-bold leading-tight mb-4">
            Votre commerce, sous contrôle, à chaque instant.
          </h1>
          <p className="text-bone/80">
            Suivez votre stock, vos ventes et vos bénéfices depuis votre téléphone, aussi simplement que de tenir votre cahier.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {["Gratuit pour commencer", "Sur téléphone", "En français"].map((t) => (
              <span key={t} className="bg-white/15 text-xs px-3 py-1.5 rounded-full">✓ {t}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="px-5 -mt-14">
        <DemoStock />
      </div>

      <section className="px-5 max-w-md mx-auto">
        <div className="mt-7">
          <Link
            href="/inscription"
            className="block text-center bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg"
          >
            Créer mon commerce
          </Link>
          <p className="text-center text-[13px] text-ink/50 mt-1.5">Gratuit jusqu&apos;à 5 produits</p>
          <Link href="/connexion" className="block text-center py-3.5 text-ink/60 font-medium">
            J&apos;ai déjà un compte
          </Link>
        </div>

        <h2 className="font-display text-2xl font-bold text-indigo-deep text-center mt-10 mb-5">Comment ça marche</h2>
        <div className="space-y-4">
          {[
            ["Ajoutez vos produits", "Nom, prix et quantité en stock."],
            ["Enregistrez vos ventes", "Le stock baisse tout seul à chaque vente."],
            ["Suivez vos bénéfices", "Vos chiffres, en clair, chaque jour."],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-3.5 items-start">
              <span className="flex-none w-9 h-9 rounded-full bg-indigo-deep text-bone font-display font-bold flex items-center justify-center">{i + 1}</span>
              <div>
                <p className="font-display font-semibold text-indigo-deep">{t}</p>
                <p className="text-sm text-ink/60">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-display text-2xl font-bold text-indigo-deep text-center mt-12 mb-5">Tout pour votre boutique</h2>
        <div className="space-y-3">
          {[
            ["📦", "bg-indigo-deep/10", "Le stock se met à jour tout seul", "Chaque vente diminue le stock, chaque achat l'augmente, sans calcul à refaire."],
            ["⚠️", "bg-bronze/15", "Alertes avant la rupture", "Diako Stock vous prévient dès qu'un article se fait rare."],
            ["📊", "bg-green-600/10", "Vos chiffres, en clair", "Ventes, bénéfices et produits qui marchent le mieux, d'un coup d'œil."],
            ["💬", "bg-green-500/10", "Reçus sur WhatsApp", "Envoyez le reçu à votre client en un geste."],
          ].map(([ic, bg, t, d]) => (
            <div key={t} className="bg-white border border-ink/10 rounded-3xl p-4 flex gap-3.5">
              <span className={`flex-none w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${bg}`}>{ic}</span>
              <div>
                <h3 className="font-display font-semibold text-indigo-deep">{t}</h3>
                <p className="text-sm text-ink/60">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border-2 border-bronze rounded-3xl p-6 text-center mt-5">
          <p className="font-display text-xl font-bold text-indigo-deep">À partir de 0 FCFA</p>
          <p className="text-sm text-ink/60 mt-1.5 mb-3">
            Plan Gratuit sans limite de durée. Passez au Standard (5 000 FCFA par mois) quand votre commerce grandit.
          </p>
          <Link href="/tarifs" className="text-bronze font-semibold">Voir les tarifs →</Link>
        </div>

        <div className="bg-gradient-to-br from-indigo-deep to-ink text-bone rounded-[28px] p-7 text-center mt-10 mb-6">
          <h2 className="font-display text-[22px] font-bold mb-2">Prêt à garder votre stock sous contrôle ?</h2>
          <p className="text-sm text-bone/80 mb-5">Créez votre commerce en moins de 2 minutes.</p>
          <Link href="/inscription" className="block bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4">
            Créer mon commerce
          </Link>
        </div>
        <p className="text-center text-xs text-ink/50 pb-8">Diako Stock · Fait au Mali 🇲🇱</p>
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
