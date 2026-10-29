"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { WHATSAPP_ABONNEMENT } from "@/lib/plans";

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

// --- Téléphone avec un vrai écran de l'application ---
function Telephone({ src, alt, className = "", hauteur }: { src: string; alt: string; className?: string; hauteur?: string }) {
  return (
    <div className={`relative mx-auto w-[220px] sm:w-[250px] rounded-[2.4rem] border-[7px] border-ink bg-ink shadow-2xl shadow-ink/30 overflow-hidden ${className}`}>
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-ink rounded-full z-10" />
      <div className="overflow-hidden rounded-[1.9rem]" style={hauteur ? { height: hauteur } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full block" loading="lazy" />
      </div>
    </div>
  );
}

const WHATSAPP = `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent("Bonjour, j'ai une question sur Diako Stock.")}`;

function PageAccueil() {
  return (
    <main className="min-h-screen bg-bone overflow-x-hidden">
      {/* HERO */}
      <section className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-10 md:pt-16 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-bronze/20 blur-3xl" />
        <div className="max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-10 md:items-center relative">
          <div className="text-center md:text-left pb-8 md:pb-16">
            <p className="font-display text-sm tracking-[0.2em] text-bronze-light font-semibold mb-4">DIAKO STOCK</p>
            <h1 className="font-display text-[34px] md:text-5xl font-bold leading-[1.1] mb-4">
              Votre stock sous contrôle.<br />
              <span className="text-bronze-light">Vos ventes en un coup d&apos;œil.</span>
            </h1>
            <p className="text-bone/80 text-base md:text-lg max-w-md mx-auto md:mx-0">
              Suivez votre stock, vos ventes et vos bénéfices depuis votre téléphone, aussi simplement que de tenir votre cahier.
            </p>
            <div className="mt-7 max-w-sm mx-auto md:mx-0">
              <Link
                href="/inscription"
                className="block text-center bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg shadow-bronze/30 active:scale-[0.98] transition-transform"
              >
                Créer mon commerce gratuitement
              </Link>
              <p className="text-[13px] text-bone/70 mt-2 text-center md:text-left">Gratuit jusqu&apos;à 5 produits · Sans carte bancaire</p>
              <Link href="/connexion" className="inline-block mt-3 text-bone/80 font-medium underline underline-offset-4">
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
          <div className="flex justify-center items-end gap-3 md:pb-0">
            <Telephone src="/ecrans/tableau-de-bord.webp" alt="Tableau de bord Diako Stock" hauteur="430px" className="md:-rotate-2" />
            <Telephone src="/ecrans/produits.webp" alt="Liste des produits Diako Stock" hauteur="430px" className="hidden sm:block mt-10 md:rotate-2" />
          </div>
        </div>
      </section>

      {/* PREUVES */}
      <section className="bg-white border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm font-medium text-indigo-deep">
          {["📱 Sur téléphone", "🇫🇷 En français", "💬 Reçus WhatsApp", "🇲🇱 Fait au Mali"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="px-5 max-w-5xl mx-auto">
        {/* COMMENT ÇA MARCHE */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-indigo-deep text-center mt-14 mb-7">Prêt en 3 étapes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["Ajoutez vos produits", "Nom, prix et quantité en stock."],
            ["Enregistrez vos ventes", "Le stock baisse tout seul à chaque vente."],
            ["Suivez vos bénéfices", "Vos chiffres, en clair, chaque jour."],
          ].map(([t, d], i) => (
            <div key={t} className="bg-white border border-ink/10 rounded-3xl p-5 flex md:block gap-4 items-start">
              <span className="flex-none w-10 h-10 rounded-full bg-indigo-deep text-bone font-display font-bold flex items-center justify-center md:mb-3">{i + 1}</span>
              <div>
                <p className="font-display font-semibold text-lg text-indigo-deep">{t}</p>
                <p className="text-sm text-ink/60 mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FONCTIONS */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-indigo-deep text-center mt-14 mb-7">Tout pour votre boutique</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            ["📦", "bg-indigo-deep/10", "Le stock se met à jour tout seul", "Chaque vente diminue le stock, chaque achat l'augmente, sans calcul à refaire."],
            ["⚠️", "bg-bronze/15", "Alertes avant la rupture", "Diako Stock vous prévient dès qu'un article se fait rare."],
            ["📊", "bg-green-600/10", "Vos chiffres, en clair", "Ventes, bénéfices et produits qui marchent le mieux, d'un coup d'œil."],
            ["💬", "bg-green-500/10", "Reçus sur WhatsApp", "Envoyez le reçu à votre client en un geste."],
          ].map(([ic, bg, t, d]) => (
            <div key={t} className="bg-white border border-ink/10 rounded-3xl p-5 flex gap-4">
              <span className={`flex-none w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${bg}`}>{ic}</span>
              <div>
                <h3 className="font-display font-semibold text-indigo-deep">{t}</h3>
                <p className="text-sm text-ink/60 mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TARIFS */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-indigo-deep text-center mt-14 mb-2">Commencez gratuitement</h2>
        <p className="text-center text-ink/60 mb-7">Passez au plan supérieur quand votre commerce grandit.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Gratuit", "0", "5 produits", false],
            ["Standard", "5 000", "100 produits", true],
            ["Pro", "7 500", "500 produits", false],
            ["Business", "15 000", "Produits illimités", false],
          ].map(([n, p, l, hot]) => (
            <div key={n as string} className={`rounded-3xl p-4 text-center border-2 ${hot ? "bg-indigo-deep text-bone border-bronze shadow-xl" : "bg-white border-ink/10"}`}>
              <p className={`font-display font-semibold ${hot ? "text-bronze-light" : "text-indigo-deep"}`}>{n}</p>
              <p className="font-display text-2xl font-bold mt-1">{p}</p>
              <p className={`text-xs ${hot ? "text-bone/70" : "text-ink/50"}`}>FCFA{p !== "0" ? " / mois" : ""}</p>
              <p className={`text-sm mt-2 font-medium ${hot ? "text-bone" : "text-ink/70"}`}>{l}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-5">
          <Link href="/tarifs" className="text-bronze font-semibold">Voir tous les tarifs →</Link>
        </div>

        {/* APPEL FINAL */}
        <div className="bg-gradient-to-br from-indigo-deep to-ink text-bone rounded-[28px] p-8 text-center mt-12 mb-6 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold mb-2">Prêt à garder votre stock sous contrôle ?</h2>
          <p className="text-bone/80 mb-5">Créez votre commerce en moins de 2 minutes.</p>
          <Link href="/inscription" className="block max-w-xs mx-auto bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4">
            Créer mon commerce
          </Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-bone/80 underline underline-offset-4 text-sm">
            Une question ? Écrivez-nous sur WhatsApp
          </a>
        </div>
        <p className="text-center text-xs text-ink/50 pb-24">Diako Stock · Fait au Mali 🇲🇱</p>
      </section>

      {/* BOUTON WHATSAPP */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Écrire sur WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] text-white font-semibold rounded-full pl-4 pr-5 py-3 shadow-xl shadow-black/25"
      >
        <span className="text-xl">💬</span> WhatsApp
      </a>
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
