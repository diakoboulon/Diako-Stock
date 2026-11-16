"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { EcranBloque, useContexteFacture } from "../commun";

type Champs = {
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  nif: string;
  rccm: string;
  infos_paiement: string;
  logo_data: string;
};

const VIDE: Champs = { nom: "", adresse: "", ville: "", telephone: "", email: "", nif: "", rccm: "", infos_paiement: "", logo_data: "" };

// Réduit l'image du logo (320 px maximum, fond blanc, JPEG léger) pour qu'elle reste petite dans la base.
async function reduireLogo(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image illisible"));
      i.src = url;
    });
    const echelle = Math.min(1, 320 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * echelle));
    const h = Math.max(1, Math.round(img.height * echelle));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const c2d = canvas.getContext("2d");
    if (!c2d) throw new Error("canvas");
    c2d.fillStyle = "#ffffff";
    c2d.fillRect(0, 0, w, h);
    c2d.drawImage(img, 0, 0, w, h);
    let qualite = 0.85;
    let data = canvas.toDataURL("image/jpeg", qualite);
    while (data.length > 150000 && qualite > 0.4) {
      qualite -= 0.1;
      data = canvas.toDataURL("image/jpeg", qualite);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MonEntreprise() {
  const ctx = useContexteFacture();
  const [champs, setChamps] = useState<Champs>(VIDE);
  const [baseAJour, setBaseAJour] = useState(true);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (!ctx || !ctx.estProprietaire) return;
    async function charger() {
      const { data } = await supabase.from("businesses").select("*").eq("id", ctx!.businessId).maybeSingle();
      if (data) {
        const d = data as Record<string, string | null>;
        setBaseAJour("email" in d && "nif" in d && "logo_data" in d);
        setChamps({
          nom: d.nom ?? "",
          adresse: d.adresse ?? "",
          ville: d.ville ?? "",
          telephone: d.telephone ?? "",
          email: d.email ?? "",
          nif: d.nif ?? "",
          rccm: d.rccm ?? "",
          infos_paiement: d.infos_paiement ?? "",
          logo_data: d.logo_data ?? "",
        });
      }
      setChargement(false);
    }
    charger();
  }, [ctx]);

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut modifier ces informations." />;
  }
  if (chargement) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }

  function maj(c: Partial<Champs>) {
    setEnregistre(false);
    setChamps((x) => ({ ...x, ...c }));
  }

  async function choisirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setErreur(null);
    if (!fichier.type.startsWith("image/")) {
      setErreur("Choisissez une image (photo ou logo).");
      return;
    }
    try {
      maj({ logo_data: await reduireLogo(fichier) });
    } catch {
      setErreur("Cette image n'a pas pu être lue. Essayez-en une autre.");
    }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!champs.nom.trim()) {
      setErreur("Indiquez le nom de votre entreprise.");
      return;
    }
    setEnvoi(true);
    const vide = (t: string) => (t.trim() ? t.trim() : null);
    const { error } = await supabase
      .from("businesses")
      .update({
        nom: champs.nom.trim(),
        adresse: vide(champs.adresse),
        ville: vide(champs.ville),
        telephone: vide(champs.telephone),
        email: vide(champs.email),
        nif: vide(champs.nif),
        rccm: vide(champs.rccm),
        infos_paiement: vide(champs.infos_paiement),
        logo_data: champs.logo_data || null,
      })
      .eq("id", ctx!.businessId);
    setEnvoi(false);
    if (error) {
      setErreur(enFrancais(error.message, "Enregistrement impossible. Vérifiez que la mise à jour de la base de données (migration 11) est bien installée."));
      return;
    }
    setEnregistre(true);
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-xl mx-auto pb-24">
      <header className="mb-5">
        <a href="/facture" className="inline-block py-1.5 text-xs font-semibold text-bronze">← Mes factures</a>
        <h1 className="font-display text-2xl font-bold text-indigo-deep">Mon entreprise</h1>
        <p className="text-sm text-ink/50">Ces informations apparaissent en haut de vos factures.</p>
      </header>

      {!baseAJour && (
        <p className="bg-clay/10 text-clay text-sm rounded-xl px-4 py-3 mb-4">
          La base de données n&apos;est pas encore à jour : le logo, l&apos;e-mail, le NIF et le RCCM ne pourront pas être enregistrés tant que la migration 11 n&apos;est pas installée.
        </p>
      )}

      <form onSubmit={enregistrer} className="space-y-5">
        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-20 rounded-xl border border-ink/10 bg-bone flex items-center justify-center overflow-hidden flex-none">
              {champs.logo_data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={champs.logo_data} alt="Logo de votre entreprise" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-ink/40 px-2 text-center">Aucun logo</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-block bg-white border-2 border-indigo-deep/20 text-indigo-deep font-semibold text-sm rounded-xl px-4 py-2.5 cursor-pointer">
                {champs.logo_data ? "Changer le logo" : "Choisir un logo"}
                <input type="file" accept="image/*" className="hidden" onChange={choisirLogo} />
              </label>
              {champs.logo_data && (
                <button type="button" onClick={() => maj({ logo_data: "" })} className="block text-sm font-medium text-clay py-1">
                  Retirer le logo
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Coordonnées</h2>
          <input className="input-field" placeholder="Nom de l'entreprise" value={champs.nom} onChange={(e) => maj({ nom: e.target.value })} />
          <input className="input-field" placeholder="Adresse" value={champs.adresse} onChange={(e) => maj({ adresse: e.target.value })} />
          <input className="input-field" placeholder="Ville" value={champs.ville} onChange={(e) => maj({ ville: e.target.value })} />
          <input className="input-field" placeholder="Téléphone" inputMode="tel" value={champs.telephone} onChange={(e) => maj({ telephone: e.target.value })} />
          <input className="input-field" placeholder="Adresse e-mail" type="email" inputMode="email" value={champs.email} onChange={(e) => maj({ email: e.target.value })} />
        </section>

        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Informations légales (facultatif)</h2>
          <input className="input-field" placeholder="NIF" value={champs.nif} onChange={(e) => maj({ nif: e.target.value })} />
          <input className="input-field" placeholder="RCCM" value={champs.rccm} onChange={(e) => maj({ rccm: e.target.value })} />
        </section>

        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Comment vos clients peuvent vous payer</h2>
          <textarea
            className="input-field min-h-[90px]"
            placeholder={"Exemple : Orange Money : 96 99 07 70 (Adama Diallo)\nVirement : Banque, numéro de compte"}
            value={champs.infos_paiement}
            onChange={(e) => maj({ infos_paiement: e.target.value })}
          />
        </section>

        {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}
        {enregistre && <p className="text-green-700 text-sm font-semibold">Informations enregistrées ✓</p>}

        <button type="submit" disabled={envoi} className="w-full bg-bronze text-white font-display font-semibold text-lg rounded-2xl py-4 shadow-lg disabled:opacity-50">
          {envoi ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </main>
  );
}
