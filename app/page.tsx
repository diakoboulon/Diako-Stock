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


// --- Icônes et illustration (dessinées pour Diako Business) ---
const ICONES: Record<string, string> = {"stock": "<path d=\"M21 8l-9-5-9 5v8l9 5 9-5V8z\"/><path d=\"M3 8l9 5 9-5M12 13v8\"/>", "facture": "<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z\"/><path d=\"M14 3v5h5M9 13h6M9 17h6\"/>", "commande": "<path d=\"M6 7h12l1 13H5L6 7z\"/><path d=\"M9 7a3 3 0 0 1 6 0\"/>", "garage": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/>", "restaurant": "<path d=\"M5 3v6a3 3 0 0 0 6 0V3M8 3v18\"/><path d=\"M17 21V3c-2.5 1-4 4-4 7.5 0 2 1 3.5 4 3.5\"/>", "pharmacie": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><path d=\"M12 8v8M8 12h8\"/>", "sante": "<path d=\"M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4z\"/><path d=\"M6 12h3l1.5-3 3 6 1.5-3h3\"/>", "transport": "<path d=\"M2 6h12v10H2z\"/><path d=\"M14 9h4l4 4v3h-8\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/>", "distribution": "<path d=\"M3 21V9l9-6 9 6v12\"/><path d=\"M8 21v-7h8v7M8 17h8\"/>", "chantier": "<path d=\"M6 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17\"/><path d=\"M14 9h3a1 1 0 0 1 1 1v11M3 21h18M9 7h2M9 11h2M9 15h2\"/>", "sav": "<path d=\"M4 14v-2a8 8 0 0 1 16 0v2\"/><rect x=\"3\" y=\"14\" width=\"4\" height=\"6\" rx=\"2\"/><rect x=\"17\" y=\"14\" width=\"4\" height=\"6\" rx=\"2\"/><path d=\"M19 20a4 4 0 0 1-4 2h-2\"/>", "bouclier": "<path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z\"/><path d=\"M9 12l2 2 4-4\"/>", "telephone": "<rect x=\"7\" y=\"2\" width=\"10\" height=\"20\" rx=\"2.5\"/><path d=\"M11 18h2\"/>", "mallette": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18\"/>", "cloche": "<path d=\"M18 16V11a6 6 0 0 0-12 0v5l-2 2h16l-2-2z\"/><path d=\"M10 21h4\"/>", "message": "<path d=\"M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.1A8.5 8.5 0 1 1 21 12z\"/>", "clients": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0\"/><path d=\"M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2A6.5 6.5 0 0 1 21.5 20\"/>", "rafraichir": "<path d=\"M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5\"/>", "fleche": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>"};
const ILLUSTRATION: string = "<defs>\n    <filter id=\"ombre\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"160%\">\n      <feDropShadow dx=\"0\" dy=\"6\" stdDeviation=\"7\" flood-color=\"#14284B\" flood-opacity=\"0.14\"/>\n    </filter>\n  </defs>\n\n  <!-- Fond -->\n  <circle cx=\"285\" cy=\"228\" r=\"196\" fill=\"#F6ECD2\"/>\n  <circle cx=\"285\" cy=\"228\" r=\"150\" fill=\"#FBF4E1\"/>\n  <circle cx=\"64\" cy=\"372\" r=\"34\" fill=\"#E4E9F2\"/>\n  <circle cx=\"512\" cy=\"96\" r=\"20\" fill=\"#E8D49A\" opacity=\"0.75\"/>\n  <circle cx=\"40\" cy=\"190\" r=\"9\" fill=\"#C9A24B\" opacity=\"0.6\"/>\n\n  <!-- Femme (derrière le bureau) -->\n  <path d=\"M112 340 C112 292 138 270 172 270 C206 270 232 292 232 340 Z\" fill=\"#1F3A6E\"/>\n  <rect x=\"158\" y=\"238\" width=\"28\" height=\"40\" rx=\"12\" fill=\"#7A4A2E\"/>\n  <circle cx=\"172\" cy=\"215\" r=\"35\" fill=\"#7A4A2E\"/>\n  <path d=\"M134 206 C131 168 160 154 187 158 C214 162 219 190 211 207 C196 196 160 196 134 206 Z\" fill=\"#D8B25A\"/>\n  <path d=\"M198 160 C216 144 236 154 231 172 C226 188 207 184 199 172 Z\" fill=\"#C9A24B\"/>\n  <path d=\"M146 190 C160 184 178 182 202 189\" stroke=\"#1F3A6E\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-dasharray=\"1 8\"/>\n  <circle cx=\"160\" cy=\"218\" r=\"2.6\" fill=\"#1B1B1F\"/>\n  <circle cx=\"184\" cy=\"218\" r=\"2.6\" fill=\"#1B1B1F\"/>\n  <path d=\"M162 230 Q172 238 182 230\" stroke=\"#1B1B1F\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/>\n  <circle cx=\"138\" cy=\"228\" r=\"4\" fill=\"#C9A24B\"/>\n\n  <!-- Homme (derrière le bureau) -->\n  <path d=\"M336 340 C336 292 358 270 392 270 C426 270 448 292 448 340 Z\" fill=\"#C9A24B\"/>\n  <path d=\"M376 272 L392 294 L408 272 Z\" fill=\"#FFFFFF\"/>\n  <rect x=\"378\" y=\"240\" width=\"28\" height=\"38\" rx=\"12\" fill=\"#5F3A25\"/>\n  <circle cx=\"392\" cy=\"216\" r=\"35\" fill=\"#5F3A25\"/>\n  <path d=\"M357 209 C354 176 376 164 394 164 C414 164 430 178 427 209 C418 192 372 190 357 209 Z\" fill=\"#1B1B1F\"/>\n  <circle cx=\"380\" cy=\"219\" r=\"2.6\" fill=\"#F5F1E8\"/>\n  <circle cx=\"404\" cy=\"219\" r=\"2.6\" fill=\"#F5F1E8\"/>\n  <path d=\"M382 231 Q392 239 402 231\" stroke=\"#F5F1E8\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/>\n\n  <!-- Bureau -->\n  <rect x=\"56\" y=\"334\" width=\"458\" height=\"22\" rx=\"11\" fill=\"#E3DCC8\"/>\n  <rect x=\"96\" y=\"356\" width=\"14\" height=\"62\" rx=\"5\" fill=\"#D5CDB6\"/>\n  <rect x=\"460\" y=\"356\" width=\"14\" height=\"62\" rx=\"5\" fill=\"#D5CDB6\"/>\n\n  <!-- Ordinateur portable (dos de l'écran) -->\n  <rect x=\"116\" y=\"276\" width=\"112\" height=\"60\" rx=\"6\" fill=\"#3A4150\"/>\n  <circle cx=\"172\" cy=\"306\" r=\"6\" fill=\"#C9A24B\"/>\n  <rect x=\"104\" y=\"332\" width=\"136\" height=\"6\" rx=\"3\" fill=\"#2B303B\"/>\n\n  <!-- Plante -->\n  <path d=\"M283 318 C270 304 268 290 276 280 C288 290 290 304 283 318 Z\" fill=\"#5E8C6A\"/>\n  <path d=\"M283 318 C296 306 304 294 300 284 C288 290 282 304 283 318 Z\" fill=\"#7BA886\"/>\n  <rect x=\"270\" y=\"316\" width=\"26\" height=\"20\" rx=\"5\" fill=\"#C9A24B\"/>\n\n  <!-- Téléphone tenu par l'homme -->\n  <path d=\"M438 296 C452 304 462 310 470 312\" stroke=\"#C9A24B\" stroke-width=\"20\" stroke-linecap=\"round\" fill=\"none\"/>\n  <rect x=\"456\" y=\"252\" width=\"32\" height=\"58\" rx=\"7\" fill=\"#20242E\"/>\n  <rect x=\"459\" y=\"257\" width=\"26\" height=\"48\" rx=\"4\" fill=\"#FFFFFF\"/>\n  <rect x=\"462\" y=\"261\" width=\"20\" height=\"6\" rx=\"3\" fill=\"#C9A24B\"/>\n  <rect x=\"462\" y=\"272\" width=\"20\" height=\"4\" rx=\"2\" fill=\"#D9DEE8\"/>\n  <rect x=\"462\" y=\"280\" width=\"14\" height=\"4\" rx=\"2\" fill=\"#D9DEE8\"/>\n  <rect x=\"462\" y=\"289\" width=\"20\" height=\"10\" rx=\"3\" fill=\"#14284B\"/>\n  <circle cx=\"474\" cy=\"312\" r=\"9\" fill=\"#5F3A25\"/>\n\n  <!-- Cartes flottantes -->\n  <g filter=\"url(#ombre)\">\n    <rect x=\"16\" y=\"52\" width=\"150\" height=\"88\" rx=\"14\" fill=\"#FFFFFF\"/>\n  </g>\n  <text x=\"30\" y=\"76\" font-family=\"Inter, Arial, sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#14284B\">Ventes du jour</text>\n  <rect x=\"32\" y=\"108\" width=\"14\" height=\"20\" rx=\"3\" fill=\"#E8D49A\"/>\n  <rect x=\"54\" y=\"98\" width=\"14\" height=\"30\" rx=\"3\" fill=\"#C9A24B\"/>\n  <rect x=\"76\" y=\"104\" width=\"14\" height=\"24\" rx=\"3\" fill=\"#E8D49A\"/>\n  <rect x=\"98\" y=\"88\" width=\"14\" height=\"40\" rx=\"3\" fill=\"#14284B\"/>\n  <rect x=\"120\" y=\"96\" width=\"14\" height=\"32\" rx=\"3\" fill=\"#C9A24B\"/>\n  <rect x=\"142\" y=\"84\" width=\"14\" height=\"44\" rx=\"3\" fill=\"#14284B\"/>\n\n  <g filter=\"url(#ombre)\">\n    <rect x=\"388\" y=\"34\" width=\"156\" height=\"56\" rx=\"14\" fill=\"#FFFFFF\"/>\n  </g>\n  <circle cx=\"414\" cy=\"62\" r=\"13\" fill=\"#2E8B57\"/>\n  <path d=\"M408 62 L413 67 L421 57\" stroke=\"#FFFFFF\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <text x=\"434\" y=\"60\" font-family=\"Inter, Arial, sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#14284B\">Vente</text>\n  <text x=\"434\" y=\"75\" font-family=\"Inter, Arial, sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#14284B\">enregistrée</text>\n\n  <g filter=\"url(#ombre)\">\n    <rect x=\"432\" y=\"116\" width=\"112\" height=\"70\" rx=\"14\" fill=\"#FFFFFF\"/>\n  </g>\n  <text x=\"446\" y=\"140\" font-family=\"Inter, Arial, sans-serif\" font-size=\"12\" font-weight=\"700\" fill=\"#14284B\">Stock à jour</text>\n  <rect x=\"446\" y=\"152\" width=\"84\" height=\"8\" rx=\"4\" fill=\"#ECE8DC\"/>\n  <rect x=\"446\" y=\"152\" width=\"62\" height=\"8\" rx=\"4\" fill=\"#C9A24B\"/>\n  <rect x=\"446\" y=\"168\" width=\"50\" height=\"6\" rx=\"3\" fill=\"#ECE8DC\"/>";

function Icone({ nom, taille = 24, className = "" }: { nom: string; taille?: number; className?: string }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONES[nom] ?? "" }}
    />
  );
}

function IllustrationEntrepreneurs() {
  return (
    <svg
      viewBox="0 0 560 440"
      className="w-full h-auto"
      role="img"
      aria-label="Deux entrepreneurs africains utilisent un ordinateur et un téléphone pour gérer leur activité"
      dangerouslySetInnerHTML={{ __html: ILLUSTRATION }}
    />
  );
}

// --- Les modules de Diako Business ---
type ModuleInfo = {
  code: string;
  nom: string;
  description: string;
  disponible: boolean;
};

const MODULES: ModuleInfo[] = [
  { code: "stock", nom: "Diako Stock", description: "Gérez vos produits, votre stock, vos ventes et vos clients à crédit.", disponible: true },
  { code: "facture", nom: "Diako Facture", description: "Créez vos factures et vos devis.", disponible: false },
  { code: "commande", nom: "Diako Commande", description: "Suivez les commandes de vos clients.", disponible: false },
  { code: "garage", nom: "Diako Garage", description: "Pour les garages et les ateliers.", disponible: false },
  { code: "restaurant", nom: "Diako Restaurant", description: "Pour les restaurants et les maquis.", disponible: false },
  { code: "pharmacie", nom: "Diako Pharmacie", description: "Pour les pharmacies.", disponible: false },
  { code: "sante", nom: "Diako Santé", description: "Pour les cliniques et les cabinets.", disponible: false },
  { code: "transport", nom: "Diako Transport", description: "Pour les transporteurs et les livreurs.", disponible: false },
  { code: "distribution", nom: "Diako Distribution", description: "Pour les grossistes et les distributeurs.", disponible: false },
  { code: "chantier", nom: "Diako Chantier", description: "Pour les chantiers et le bâtiment.", disponible: false },
  { code: "sav", nom: "Diako SAV Pro", description: "Pour le service après-vente.", disponible: false },
];

const lienWhatsApp = (message: string) =>
  `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent(message)}`;

const WHATSAPP = lienWhatsApp("Bonjour, j'ai une question sur Diako Business.");

const BOUTON_PRINCIPAL =
  "inline-flex items-center justify-center gap-2 bg-[#C9A24B] text-[#14284B] font-display font-semibold text-[17px] rounded-2xl px-7 py-4 shadow-lg shadow-[#C9A24B]/30 hover:bg-[#B8913C] active:scale-[0.98] transition";
const BOUTON_SECONDAIRE =
  "inline-flex items-center justify-center gap-2 bg-white text-[#14284B] font-display font-semibold text-[17px] rounded-2xl px-7 py-4 border-2 border-[#14284B]/20 hover:border-[#14284B]/45 active:scale-[0.98] transition";

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-[#14284B] text-[#E4B85C] font-display font-bold text-lg flex items-center justify-center">
        D
      </span>
      <span className="font-display text-[17px] font-bold tracking-wide text-[#14284B]">
        DIAKO <span className="text-[#9A7424]">BUSINESS</span>
      </span>
    </span>
  );
}

function Etat({ disponible }: { disponible: boolean }) {
  return disponible ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full bg-[#2E8B57]/10 text-[#1F6B40] px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57]" /> Disponible
    </span>
  ) : (
    <span className="inline-flex items-center text-[11px] font-semibold rounded-full bg-[#C9A24B]/15 text-[#7A5A12] px-2.5 py-1">
      Bientôt disponible
    </span>
  );
}

const LIENS_MENU: [string, string][] = [
  ["Modules", "#modules"],
  ["Pourquoi nous choisir", "#pourquoi"],
  ["Comment ça marche", "#fonctionnement"],
  ["Essai gratuit", "#essai"],
];

function PageAccueil() {
  const autres = MODULES.filter((m) => !m.disponible);
  const stock = MODULES[0];

  return (
    <main className="min-h-screen bg-[#FAF8F3] text-[#3A3F47] overflow-x-hidden">
      {/* EN-TÊTE */}
      <header>
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <Link href="/" aria-label="DIAKO BUSINESS, accueil">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Navigation principale">
            {LIENS_MENU.map(([libelle, lien]) => (
              <a key={lien} href={lien} className="hover:text-[#14284B] transition-colors">
                {libelle}
              </a>
            ))}
            <Link href="/tarifs" className="hover:text-[#14284B] transition-colors">
              Tarifs
            </Link>
          </nav>
          <Link
            href="/connexion"
            className="inline-flex items-center border-2 border-[#14284B]/20 text-[#14284B] font-semibold text-sm rounded-full px-5 py-2.5 hover:border-[#14284B]/45 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </header>

      {/* PREMIÈRE SECTION */}
      <section className="relative">
        <div className="absolute -top-10 right-0 w-[420px] h-[420px] rounded-full bg-[#C9A24B]/15 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 pt-6 pb-14 md:pt-12 md:pb-20 relative lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div>
            <p className="inline-block text-[13px] font-semibold text-[#7A5A12] bg-[#C9A24B]/15 rounded-full px-4 py-1.5 mb-5">
              La technologie au service de vos affaires.
            </p>
            <h1 className="font-display text-[36px] md:text-5xl font-bold leading-[1.1] text-[#14284B]">
              Gérez votre entreprise simplement, <span className="text-[#9A7424]">depuis votre téléphone.</span>
            </h1>
            <p className="text-base md:text-lg mt-5 max-w-xl leading-relaxed">
              DIAKO BUSINESS réunit des outils de gestion pour chaque métier : stock, factures, commandes et bien plus.
              Diako Stock est disponible dès aujourd&apos;hui, les autres modules arrivent bientôt.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md sm:max-w-none">
              <Link href="/inscription" className={BOUTON_PRINCIPAL}>
                Commencer gratuitement
              </Link>
              <a href="#modules" className={BOUTON_SECONDAIRE}>
                Découvrir nos modules
              </a>
            </div>
            <p className="text-sm text-[#5B616B] mt-4">Gratuit jusqu&apos;à 5 produits · Sans carte bancaire · 100 % en français</p>
          </div>
          <div className="mt-10 lg:mt-0 max-w-xl mx-auto w-full">
            <IllustrationEntrepreneurs />
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="bg-[#F3F4F6] border-y border-[#E7E3D8]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B]">Un module pour chaque métier</h2>
            <p className="mt-3 text-[#5B616B]">
              Choisissez celui qui correspond à votre activité. Diako Stock est ouvert dès maintenant, les autres arrivent bientôt.
            </p>
          </div>

          <Link
            href="/inscription"
            className="mt-10 block bg-white border-2 border-[#C9A24B] rounded-3xl p-6 md:p-8 shadow-xl shadow-[#C9A24B]/10 hover:shadow-2xl hover:shadow-[#C9A24B]/20 transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
              <span className="flex-none w-16 h-16 rounded-2xl bg-[#C9A24B]/15 text-[#14284B] flex items-center justify-center">
                <Icone nom="stock" taille={34} />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-2xl font-bold text-[#14284B]">{stock.nom}</h3>
                  <Etat disponible />
                  <span className="text-xs font-semibold text-[#7A5A12]">Premier module disponible</span>
                </div>
                <p className="mt-2">{stock.description}</p>
                <p className="text-sm text-[#5B616B] mt-1">Gratuit jusqu&apos;à 5 produits · Sans carte bancaire</p>
              </div>
              <span className={`${BOUTON_PRINCIPAL} flex-none`}>
                Commencer gratuitement <Icone nom="fleche" taille={20} />
              </span>
            </div>
          </Link>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {autres.map((m) => (
              <a
                key={m.code}
                href={lienWhatsApp(`Bonjour, je suis intéressé par ${m.nom}. Prévenez-moi dès qu'il est disponible.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-[#E7E3D8] rounded-3xl p-4 md:p-5 flex flex-col hover:border-[#C9A24B]/60 hover:shadow-lg hover:shadow-[#14284B]/5 transition"
              >
                <span className="w-12 h-12 rounded-2xl bg-[#C9A24B]/12 text-[#14284B] flex items-center justify-center">
                  <Icone nom={m.code} taille={26} />
                </span>
                <h3 className="font-display font-semibold text-[#14284B] mt-3 leading-tight">{m.nom}</h3>
                <p className="text-[13px] text-[#5B616B] mt-1 flex-1">{m.description}</p>
                <div className="mt-3">
                  <Etat disponible={false} />
                </div>
                <p className="text-xs font-semibold text-[#14284B] underline underline-offset-2 mt-2">Me prévenir sur WhatsApp</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI CHOISIR DIAKO BUSINESS */}
      <section id="pourquoi" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B] text-center">
            Pourquoi choisir DIAKO BUSINESS ?
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              ["bouclier", "Confiance", "Les données de chaque entreprise sont séparées et protégées. Vous seul voyez les chiffres de votre activité."],
              ["telephone", "Simplicité", "Pensé pour le téléphone, aussi simple que de tenir votre cahier. Pas besoin d'être expert en informatique."],
              ["mallette", "Professionnalisme", "Des reçus, des rapports et des chiffres clairs pour gérer votre entreprise comme les plus grands."],
            ].map(([icone, titre, texte]) => (
              <div key={titre} className="bg-[#FAF8F3] border border-[#E7E3D8] rounded-3xl p-7">
                <span className="w-14 h-14 rounded-2xl bg-[#C9A24B]/15 text-[#14284B] flex items-center justify-center">
                  <Icone nom={icone} taille={28} />
                </span>
                <h3 className="font-display text-xl font-bold text-[#14284B] mt-5">{titre}</h3>
                <p className="mt-2 leading-relaxed">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVANTAGES DE LA PLATEFORME */}
      <section className="bg-[#FAF8F3]">
        <div className="max-w-6xl mx-auto px-5 pb-16 md:pb-20 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B]">Les avantages de la plateforme</h2>
            <p className="mt-3 text-[#5B616B]">Disponibles dès aujourd&apos;hui avec Diako Stock.</p>
            <div className="mt-8 space-y-5">
              {[
                ["rafraichir", "Un stock toujours à jour", "Chaque vente met le stock à jour toute seule, sans calcul à refaire."],
                ["cloche", "Des alertes avant la rupture", "Vous êtes prévenu dès qu'un article se fait rare."],
                ["message", "Des reçus sur WhatsApp", "Envoyez le reçu à votre client en un geste."],
                ["clients", "Le suivi des crédits clients", "Sachez qui vous doit de l'argent et relancez-le sur WhatsApp."],
                ["globe", "Partout, en français", "Sur téléphone, tablette ou ordinateur, sans rien installer."],
              ].map(([icone, titre, texte]) => (
                <div key={titre} className="flex gap-4">
                  <span className="flex-none w-11 h-11 rounded-xl bg-white border border-[#E7E3D8] text-[#14284B] flex items-center justify-center">
                    <Icone nom={icone} taille={22} />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-[#14284B]">{titre}</h3>
                    <p className="text-[15px]">{texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 lg:mt-0 rounded-[32px] bg-gradient-to-br from-[#F6ECD2] to-[#FBF4E1] pt-10 px-4 overflow-hidden">
            <DeuxTelephones />
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="fonctionnement" className="bg-white border-y border-[#E7E3D8]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B] text-center">Comment ça marche ?</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              ["Choisissez votre module", "Sélectionnez celui qui correspond à votre métier."],
              ["Créez votre compte", "En moins de 2 minutes, sans carte bancaire."],
              ["Gérez votre activité", "Ajoutez vos produits, enregistrez vos ventes et suivez vos chiffres."],
            ].map(([titre, texte], i) => (
              <div key={titre} className="bg-[#FAF8F3] border border-[#E7E3D8] rounded-3xl p-7">
                <span className="w-11 h-11 rounded-full bg-[#C9A24B] text-[#14284B] font-display font-bold text-lg flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-bold text-[#14284B] mt-5">{titre}</h3>
                <p className="mt-2">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESSAI GRATUIT */}
      <section id="essai" className="bg-[#F3F4F6]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B]">Essayez sans risque</h2>
            <p className="mt-3 text-[#5B616B]">Testez avant de vous engager, et passez à une formule payante seulement quand votre activité grandit.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            <div className="bg-white border-2 border-[#C9A24B] rounded-3xl p-7">
              <Etat disponible />
              <h3 className="font-display text-2xl font-bold text-[#14284B] mt-3">Diako Stock : gratuit pour commencer</h3>
              <p className="mt-2">Jusqu&apos;à 5 produits, sans limite de durée et sans carte bancaire. Vous passez à une formule supérieure quand vous en avez besoin.</p>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href="/inscription" className={BOUTON_PRINCIPAL}>
                  Commencer gratuitement
                </Link>
                <Link href="/tarifs" className="text-[#14284B] font-semibold underline underline-offset-4">
                  Voir les tarifs
                </Link>
              </div>
            </div>
            <div className="bg-white border border-[#E7E3D8] rounded-3xl p-7">
              <span className="inline-flex items-center text-[11px] font-semibold rounded-full bg-[#14284B]/8 text-[#14284B] px-2.5 py-1">
                Prochains modules
              </span>
              <h3 className="font-display text-2xl font-bold text-[#14284B] mt-3">30 jours d&apos;essai gratuit</h3>
              <p className="mt-2">
                Chaque nouveau module sera proposé avec 30 jours d&apos;essai gratuit, pour le tester tranquillement avant de vous abonner.
              </p>
              <a href="#modules" className="inline-block mt-6 text-[#14284B] font-semibold underline underline-offset-4">
                Voir les modules à venir
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* APPEL À L'INSCRIPTION */}
      <section className="bg-[#FAF8F3]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="rounded-[32px] bg-gradient-to-br from-[#F6ECD2] to-[#FBF4E1] border border-[#C9A24B]/30 px-6 py-12 md:py-14 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#14284B]">Prêt à faire avancer votre entreprise ?</h2>
            <p className="mt-3 max-w-xl mx-auto">Rejoignez DIAKO BUSINESS et commencez dès aujourd&apos;hui avec Diako Stock.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-md sm:max-w-none mx-auto">
              <Link href="/inscription" className={BOUTON_PRINCIPAL}>
                Commencer gratuitement
              </Link>
              <Link href="/connexion" className={BOUTON_SECONDAIRE}>
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PIED DE PAGE */}
      <footer className="bg-white border-t border-[#E7E3D8]">
        <div className="max-w-6xl mx-auto px-5 py-12 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 text-[#14284B] font-medium">La technologie au service de vos affaires.</p>
            <p className="mt-1 text-sm text-[#5B616B]">Fait au Mali 🇲🇱, pour les entrepreneurs d&apos;Afrique francophone.</p>
          </div>
          <div>
            <p className="font-display font-semibold text-[#14284B] mb-3">Plateforme</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#modules" className="hover:text-[#14284B]">Nos modules</a></li>
              <li><a href="#fonctionnement" className="hover:text-[#14284B]">Comment ça marche</a></li>
              <li><a href="#essai" className="hover:text-[#14284B]">Essai gratuit</a></li>
              <li><Link href="/tarifs" className="hover:text-[#14284B]">Tarifs</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold text-[#14284B] mb-3">Mon compte</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/connexion" className="hover:text-[#14284B]">Se connecter</Link></li>
              <li><Link href="/inscription" className="hover:text-[#14284B]">Créer un compte</Link></li>
              <li>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-[#14284B]">
                  Nous écrire sur WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E7E3D8]">
          <p className="max-w-6xl mx-auto px-5 py-5 text-xs text-[#5B616B]">
            © {new Date().getFullYear()} DIAKO BUSINESS. Tous droits réservés.
          </p>
        </div>
      </footer>

      {/* BOUTON WHATSAPP */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Nous écrire sur WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] text-white font-semibold rounded-full pl-4 pr-5 py-3 shadow-xl shadow-black/20"
      >
        <Icone nom="message" taille={22} /> WhatsApp
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
