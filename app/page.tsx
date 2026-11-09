"use client";

import { useEffect, useRef, useState } from "react";
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

// --- Compteur animé ---
function useCompteur(cible: number, duree = 700) {
  const [val, setVal] = useState(cible);
  const ref = useRef(cible);
  useEffect(() => {
    const debut = ref.current;
    if (debut === cible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current = cible;
      setVal(cible);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / duree);
      const v = Math.round(debut + (cible - debut) * (1 - Math.pow(1 - p, 3)));
      ref.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);
  return val;
}

const fcfa = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

// --- Démonstration animée : des ventes qui s'enregistrent en direct ---
const PRODUITS_DEMO = [
  { nom: "Patch Kinoki", prix: 3000, unite: "pièce", stock: 43 },
  { nom: "Savon de Karité", prix: 1500, unite: "pièce", stock: 4 },
  { nom: "Beurre de karité", prix: 2500, unite: "pot", stock: 0 },
  { nom: "Huile de coco", prix: 2000, unite: "litre", stock: 18 },
];
// [produit, quantité vendue]
const VENTES_DEMO: [number, number][] = [[0, 1], [3, 2], [1, 1], [0, 2], [3, 1]];

function useDemoVentes() {
  const [etape, setEtape] = useState(0); // 0 = état de départ
  const [dernier, setDernier] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setEtape((e) => {
        const suivant = e >= VENTES_DEMO.length ? 0 : e + 1;
        if (suivant === 0) {
          setDernier(null);
          setToast(null);
        } else {
          const [p, q] = VENTES_DEMO[suivant - 1];
          setDernier(p);
          setToast(`Vente enregistrée · +${fcfa(PRODUITS_DEMO[p].prix * q)} FCFA`);
        }
        return suivant;
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(id);
  }, [toast]);

  const stocks = PRODUITS_DEMO.map((p) => p.stock);
  let ca = 45000;
  let nb = 8;
  for (let i = 0; i < etape; i++) {
    const [p, q] = VENTES_DEMO[i];
    stocks[p] -= q;
    ca += PRODUITS_DEMO[p].prix * q;
    nb += 1;
  }
  return { stocks, ca, nb, dernier, toast, etape };
}

// --- Téléphone (cadre) ---
function Telephone({ children, className = "", hauteur = "430px" }: { children: React.ReactNode; className?: string; hauteur?: string }) {
  return (
    <div className={`relative mx-auto w-[220px] sm:w-[250px] rounded-[2.4rem] border-[7px] border-ink bg-ink shadow-2xl shadow-ink/30 overflow-hidden ${className}`}>
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-ink rounded-full z-10" />
      <div className="overflow-hidden rounded-[1.9rem] bg-bone relative" style={{ height: hauteur }}>
        {children}
      </div>
    </div>
  );
}

function EcranTableau({ d }: { d: ReturnType<typeof useDemoVentes> }) {
  const ca = useCompteur(d.ca);
  const faibles = 1 + d.stocks.filter((q) => q > 0 && q <= 5).length;
  const ruptures = d.stocks.filter((q) => q === 0).length;
  return (
    <div className="px-3 pt-6 text-ink">
      <p className="text-[9px] text-ink/50">Diako Sugu</p>
      <p className="font-display font-bold text-[15px] text-indigo-deep leading-tight">Bonjour Adama 👋</p>
      <div className="mt-3 rounded-2xl bg-indigo-deep text-bone p-3">
        <p className="text-[9px] text-bone/70">Ventes aujourd&apos;hui</p>
        <p className="font-display font-bold text-[24px] leading-tight">{fcfa(ca)} FCFA</p>
        <span className="inline-block mt-1 text-[9px] bg-white/15 rounded-full px-2 py-0.5">🛒 {d.nb} ventes aujourd&apos;hui</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        <div className="bg-white rounded-xl p-2 border border-ink/10">
          <p className="text-[13px]">📦</p><p className="font-display font-bold text-[15px] text-indigo-deep">12</p><p className="text-[8px] text-ink/50">Produits</p>
        </div>
        <div className="bg-bronze/10 rounded-xl p-2 border border-bronze/30">
          <p className="text-[13px]">⚠️</p><p className="font-display font-bold text-[15px] text-bronze transition-all">{faibles}</p><p className="text-[8px] text-ink/50">Stock faible</p>
        </div>
        <div className="bg-clay/10 rounded-xl p-2 border border-clay/30">
          <p className="text-[13px]">🚫</p><p className="font-display font-bold text-[15px] text-clay">{ruptures}</p><p className="text-[8px] text-ink/50">Ruptures</p>
        </div>
      </div>
      <div className="mt-2 rounded-xl bg-bronze/10 border border-bronze/30 px-2 py-1.5 flex justify-between text-[9px]">
        <span>🔔 <b>{faibles + ruptures} produits</b> à réapprovisionner</span>
        <span className="text-bronze font-semibold">Voir →</span>
      </div>
      <div className="mt-2 rounded-xl bg-white border border-ink/10 p-2">
        <div className="flex justify-between items-end">
          <div><p className="text-[8px] text-ink/50">Mon plan</p><p className="font-display font-bold text-[12px] text-indigo-deep">Standard</p></div>
          <span className="text-[9px] text-bronze font-semibold">Améliorer →</span>
        </div>
        <div className="h-1.5 rounded-full bg-ink/10 mt-1.5"><div className="h-full w-[12%] rounded-full bg-indigo-deep" /></div>
        <p className="text-[8px] text-ink/50 mt-1">12 produits sur 100 utilisés</p>
      </div>
      <div className="absolute left-3 right-3 bottom-4">
        <div
          className={`mb-2 rounded-xl bg-green-600 text-white text-[10px] font-semibold px-2.5 py-2 shadow-lg transition-all duration-500 ${
            d.toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          ✓ {d.toast ?? "Vente enregistrée"}
        </div>
        <div className="rounded-xl bg-bronze text-white text-center font-display font-semibold text-[11px] py-2.5">+ Nouvelle vente</div>
      </div>
    </div>
  );
}

function EcranProduits({ d }: { d: ReturnType<typeof useDemoVentes> }) {
  return (
    <div className="px-3 pt-6 text-ink">
      <div className="flex justify-between items-start">
        <div><p className="font-display font-bold text-[16px] text-indigo-deep leading-tight">Mes produits</p><p className="text-[9px] text-ink/50">12 produits en stock</p></div>
        <span className="bg-bronze text-white text-[9px] font-semibold rounded-lg px-2 py-1">+ Ajouter</span>
      </div>
      <div className="mt-2 rounded-xl bg-white border border-ink/10 p-2">
        <div className="flex justify-between text-[9px]"><span>Plan <b className="text-indigo-deep">Standard</b></span><span className="font-semibold">12 / 100 produits</span></div>
        <div className="h-1.5 rounded-full bg-ink/10 mt-1"><div className="h-full w-[12%] rounded-full bg-indigo-deep" /></div>
      </div>
      <div className="mt-2 rounded-xl bg-white border border-ink/10 px-2 py-1.5 text-[9px] text-ink/40">🔍 Rechercher un produit...</div>
      <div className="mt-2 space-y-1.5">
        {PRODUITS_DEMO.map((p, i) => {
          const q = d.stocks[i];
          const etat = q === 0 ? "rupture" : q <= 5 ? "faible" : "ok";
          return (
            <div
              key={p.nom}
              className={`rounded-xl border px-2 py-1.5 flex items-center gap-2 transition-all duration-500 ${
                etat === "rupture" ? "bg-clay/10 border-clay/30" : etat === "faible" ? "bg-bronze/10 border-bronze/30" : "bg-white border-ink/10"
              } ${d.dernier === i ? "ring-2 ring-green-500 scale-[1.03]" : ""}`}
            >
              <span className="w-6 h-6 rounded-lg bg-indigo-deep/10 flex items-center justify-center text-[11px]">📦</span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-[10px] truncate">{p.nom}</p>
                <p className="text-[8px] text-ink/50">{fcfa(p.prix)} FCFA · {p.unite}</p>
              </div>
              <div className="text-right">
                <p className={`font-display font-bold text-[13px] leading-none ${etat === "rupture" ? "text-clay" : etat === "faible" ? "text-bronze" : "text-indigo-deep"}`}>{q}</p>
                <p className="text-[7px] text-ink/50">{etat === "rupture" ? "Rupture" : etat === "faible" ? "Stock faible" : "en stock"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeuxTelephones() {
  const d = useDemoVentes();
  return (
    <div className="flex justify-center items-end gap-3 md:pb-0">
      <Telephone className="md:-rotate-2 animate-flotte"><EcranTableau d={d} /></Telephone>
      <Telephone className="hidden sm:block mt-10 md:rotate-2 animate-flotte2"><EcranProduits d={d} /></Telephone>
    </div>
  );
}


// --- Les modules de Diako Business ---
type ModuleInfo = {
  code: string;
  nom: string;
  icone: string;
  description: string;
  disponible: boolean;
};

const MODULES: ModuleInfo[] = [
  { code: "stock", nom: "Diako Stock", icone: "📦", description: "Produits, stock, ventes, clients à crédit et rapports.", disponible: true },
  { code: "facture", nom: "Diako Facture", icone: "🧾", description: "Factures et devis.", disponible: false },
  { code: "commande", nom: "Diako Commande", icone: "🛍️", description: "Commandes de vos clients.", disponible: false },
  { code: "garage", nom: "Diako Garage", icone: "🔧", description: "Garages et ateliers.", disponible: false },
  { code: "restaurant", nom: "Diako Restaurant", icone: "🍽️", description: "Restaurants et maquis.", disponible: false },
  { code: "pharmacie", nom: "Diako Pharmacie", icone: "💊", description: "Pharmacies.", disponible: false },
  { code: "sante", nom: "Diako Santé", icone: "🩺", description: "Cliniques et cabinets.", disponible: false },
  { code: "sav", nom: "Diako SAV Pro", icone: "📞", description: "Service après-vente.", disponible: false },
  { code: "distribution", nom: "Diako Distribution", icone: "🚚", description: "Grossistes et livraisons.", disponible: false },
  { code: "chantier", nom: "Diako Chantier", icone: "🏗️", description: "Chantiers et bâtiment.", disponible: false },
];

const lienWhatsApp = (message: string) =>
  `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent(message)}`;

const WHATSAPP = lienWhatsApp("Bonjour, j'ai une question sur Diako Business.");

function MosaiqueModules() {
  const codes = ["stock", "facture", "commande", "restaurant", "garage", "pharmacie"];
  const tuiles = MODULES.filter((m) => codes.includes(m.code));
  return (
    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto md:max-w-sm pb-10 md:pb-0">
      {tuiles.map((m, i) => (
        <div
          key={m.code}
          className={`rounded-3xl border border-white/15 bg-white/10 p-4 ${i % 2 === 0 ? "animate-flotte" : "animate-flotte2 mt-6"}`}
        >
          <span className="text-3xl">{m.icone}</span>
          <p className="font-display font-semibold mt-2 text-sm">{m.nom}</p>
          <p className={`text-[11px] mt-0.5 ${m.disponible ? "text-bronze-light font-semibold" : "text-bone/60"}`}>
            {m.disponible ? "Disponible" : "Bientôt"}
          </p>
        </div>
      ))}
    </div>
  );
}

function PageAccueil() {
  return (
    <main className="min-h-screen bg-bone overflow-x-hidden">
      {/* HERO */}
      <section className="bg-gradient-to-br from-indigo-deep to-ink text-bone px-6 pt-6 md:pt-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-bronze/20 blur-3xl" />
        <div className="max-w-5xl mx-auto relative">
          <nav className="flex items-center justify-between">
            <span className="font-display text-lg font-bold tracking-wide">
              DIAKO <span className="text-bronze-light">BUSINESS</span>
            </span>
            <Link href="/connexion" className="text-sm font-medium border border-bone/30 rounded-full px-4 py-2">
              Se connecter
            </Link>
          </nav>

          <div className="md:grid md:grid-cols-2 md:gap-10 md:items-center pt-10 md:pt-14">
            <div className="text-center md:text-left pb-10 md:pb-16">
              <h1 className="font-display text-[34px] md:text-5xl font-bold leading-[1.1] mb-4">
                Gérez votre entreprise.<br />
                <span className="text-bronze-light">Un module pour chaque métier.</span>
              </h1>
              <p className="text-bone/80 text-base md:text-lg max-w-md mx-auto md:mx-0">
                Une plateforme de gestion pensée pour les entreprises d&apos;Afrique, depuis votre téléphone.
                Diako Stock est disponible dès maintenant, les autres modules arrivent bientôt.
              </p>
              <div className="mt-7 max-w-sm mx-auto md:mx-0">
                <a
                  href="#modules"
                  className="block text-center bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg shadow-bronze/30 active:scale-[0.98] transition-transform"
                >
                  Choisir mon module
                </a>
                <Link href="/connexion" className="inline-block mt-3 text-bone/80 font-medium underline underline-offset-4">
                  J&apos;ai déjà un compte
                </Link>
              </div>
            </div>
            <MosaiqueModules />
          </div>
        </div>
      </section>

      {/* PREUVES */}
      <section className="bg-white border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm font-medium text-indigo-deep">
          {["📱 Sur téléphone", "🇫🇷 En français", "🔒 Données séparées par entreprise", "🇲🇱 Fait au Mali"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="px-5 max-w-5xl mx-auto">
        {/* MODULES */}
        <h2 id="modules" className="scroll-mt-6 font-display text-2xl md:text-3xl font-bold text-indigo-deep text-center mt-14 mb-2">
          Choisissez votre module
        </h2>
        <p className="text-center text-ink/60 mb-7">Un module par métier. Touchez celui qui vous correspond.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MODULES.map((m) =>
            m.disponible ? (
              <Link
                key={m.code}
                href="/inscription"
                className="col-span-2 md:col-span-3 bg-white border-2 border-bronze rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg shadow-bronze/10 active:scale-[0.99] transition-transform"
              >
                <span className="flex-none w-14 h-14 rounded-2xl bg-bone flex items-center justify-center text-3xl">{m.icone}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg text-indigo-deep">{m.nom}</h3>
                    <span className="text-[11px] font-semibold rounded-full bg-green-600/10 text-green-700 px-2.5 py-0.5">Disponible</span>
                  </div>
                  <p className="text-sm text-ink/60 mt-0.5">{m.description}</p>
                  <p className="text-xs text-ink/50 mt-1">Gratuit jusqu&apos;à 5 produits · Sans carte bancaire</p>
                </div>
                <span className="flex-none bg-bronze text-white font-display font-semibold rounded-xl px-5 py-3 text-center">
                  Commencer gratuitement →
                </span>
              </Link>
            ) : (
              <a
                key={m.code}
                href={lienWhatsApp(`Bonjour, je suis intéressé par ${m.nom}. Prévenez-moi dès qu'il est disponible.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-ink/10 rounded-3xl p-4 active:scale-[0.98] transition-transform"
              >
                <span className="text-3xl">{m.icone}</span>
                <h3 className="font-display font-semibold text-indigo-deep mt-2 leading-tight">{m.nom}</h3>
                <p className="text-xs text-ink/60 mt-1">{m.description}</p>
                <p className="text-[11px] font-semibold text-bronze mt-3">Bientôt</p>
                <p className="text-xs text-indigo-deep underline underline-offset-2 mt-0.5">Me prévenir sur WhatsApp</p>
              </a>
            )
          )}
        </div>

        {/* COMMENT ÇA MARCHE */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-indigo-deep text-center mt-14 mb-7">Prêt en 3 étapes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["Choisissez votre module", "Celui qui correspond à votre métier."],
            ["Créez votre compte", "En moins de 2 minutes, sans carte bancaire."],
            ["Travaillez depuis votre téléphone", "Vos données restent séparées de celles des autres entreprises."],
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
      </section>

      {/* DIAKO STOCK EN DÉTAIL */}
      <section id="diako-stock" className="bg-white border-y border-ink/10 mt-14 scroll-mt-6">
        <div className="max-w-5xl mx-auto px-5 py-12 md:grid md:grid-cols-2 md:gap-10 md:items-center">
          <div>
            <p className="font-display text-sm tracking-[0.2em] text-bronze font-semibold mb-2">DIAKO STOCK</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-indigo-deep leading-tight">
              Votre stock sous contrôle. Vos ventes en un coup d&apos;œil.
            </h2>
            <p className="text-ink/60 mt-3">
              Suivez votre stock, vos ventes et vos bénéfices depuis votre téléphone, aussi simplement que de tenir votre cahier.
            </p>

            <div className="mt-6 space-y-3">
              {[
                ["📦", "bg-indigo-deep/10", "Le stock se met à jour tout seul", "Chaque vente diminue le stock, chaque achat l'augmente."],
                ["⚠️", "bg-bronze/15", "Alertes avant la rupture", "Vous êtes prévenu dès qu'un article se fait rare."],
                ["📊", "bg-green-600/10", "Vos chiffres, en clair", "Ventes, bénéfices et produits qui marchent le mieux."],
                ["💬", "bg-green-500/10", "Reçus sur WhatsApp", "Envoyez le reçu à votre client en un geste."],
              ].map(([ic, bg, t, d]) => (
                <div key={t} className="flex gap-3">
                  <span className={`flex-none w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${bg}`}>{ic}</span>
                  <div>
                    <h3 className="font-display font-semibold text-indigo-deep">{t}</h3>
                    <p className="text-sm text-ink/60">{d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 max-w-sm">
              <Link
                href="/inscription"
                className="block text-center bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4 shadow-lg shadow-bronze/30"
              >
                Créer mon commerce gratuitement
              </Link>
              <p className="text-[13px] text-ink/50 mt-2">Gratuit jusqu&apos;à 5 produits · Sans carte bancaire</p>
              <Link href="/tarifs" className="inline-block mt-2 text-bronze font-semibold">Voir les tarifs →</Link>
            </div>
          </div>

          <div className="mt-10 md:mt-0 bg-gradient-to-br from-indigo-deep to-ink rounded-[32px] pt-10 px-4 overflow-hidden">
            <DeuxTelephones />
          </div>
        </div>
      </section>

      <section className="px-5 max-w-5xl mx-auto">
        {/* APPEL FINAL */}
        <div className="bg-gradient-to-br from-indigo-deep to-ink text-bone rounded-[28px] p-8 text-center mt-12 mb-6 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-bold mb-2">Prêt à faire avancer votre entreprise ?</h2>
          <p className="text-bone/80 mb-5">Commencez dès aujourd&apos;hui avec Diako Stock, et retrouvez bientôt les autres modules.</p>
          <a href="#modules" className="block max-w-xs mx-auto bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl py-4">
            Choisir mon module
          </a>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-bone/80 underline underline-offset-4 text-sm">
            Une question ? Écrivez-nous sur WhatsApp
          </a>
        </div>
        <p className="text-center text-xs text-ink/50 pb-24">Diako Business · Fait au Mali 🇲🇱</p>
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
