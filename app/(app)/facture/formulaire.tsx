"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calculerTotaux, fcfa } from "@/lib/facture";
import type { ContexteFacture } from "./commun";

type Client = { id: string; nom: string; telephone: string | null; whatsapp: string | null; adresse: string | null };
type Produit = { id: string; nom: string; prix_vente: number };

export type LigneSaisie = { productId: string; designation: string; quantite: string; prix: string };

export type ValeursFacture = {
  clientId: string;
  clientNom: string;
  clientTel: string;
  clientAdresse: string;
  lignes: LigneSaisie[];
  remiseEnPourcent: boolean;
  remiseValeur: string;
  tva: string;
  dateFacture: string;
  dateEcheance: string;
  note: string;
};

export type Parametres = {
  p_customer: string | null;
  p_client_nom: string;
  p_client_telephone: string | null;
  p_client_adresse: string | null;
  p_lignes: { product_id: string | null; designation: string; quantite: number; prix_unitaire: number }[];
  p_remise_taux: number | null;
  p_remise_montant: number;
  p_tva_taux: number;
  p_date_facture: string | null;
  p_date_echeance: string | null;
  p_note: string | null;
};

export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function valeursVides(): ValeursFacture {
  return {
    clientId: "",
    clientNom: "",
    clientTel: "",
    clientAdresse: "",
    lignes: [{ productId: "", designation: "", quantite: "1", prix: "" }],
    remiseEnPourcent: true,
    remiseValeur: "",
    tva: "0",
    dateFacture: aujourdhui(),
    dateEcheance: "",
    note: "",
  };
}

type Props = {
  ctx: ContexteFacture;
  initial: ValeursFacture;
  titre: string;
  libelleBouton: string;
  libelleEnCours: string;
  lienRetour: [string, string];
  enregistrer: (p: Parametres) => Promise<string | null>; // renvoie un message d'erreur, ou null si tout va bien
};

export default function FormulaireFacture({ ctx, initial, titre, libelleBouton, libelleEnCours, lienRetour, enregistrer }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [v, setV] = useState<ValeursFacture>(initial);
  const [cles, setCles] = useState<number[]>(initial.lignes.map((_, i) => i + 1));
  const prochaineCle = useRef(initial.lignes.length + 1);
  const optionsParDefaut =
    Number(initial.remiseValeur) > 0 || Number(initial.tva) > 0 || !!initial.dateEcheance || !!initial.note || initial.dateFacture !== aujourdhui();
  const [options, setOptions] = useState(optionsParDefaut);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("customers").select("id, nom, telephone, whatsapp, adresse").eq("business_id", ctx.businessId).eq("actif", true).order("nom"),
        supabase.from("products").select("id, nom, prix_vente").eq("business_id", ctx.businessId).eq("actif", true).order("nom"),
      ]);
      setClients((c ?? []) as Client[]);
      setProduits((p ?? []) as Produit[]);
    }
    charger();
  }, [ctx.businessId]);

  function maj(champs: Partial<ValeursFacture>) {
    setV((x) => ({ ...x, ...champs }));
  }

  function choisirClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (c) maj({ clientId: id, clientNom: c.nom, clientTel: c.telephone || c.whatsapp || "", clientAdresse: c.adresse || "" });
    else maj({ clientId: "", clientNom: "", clientTel: "", clientAdresse: "" });
  }

  function majLigne(i: number, champs: Partial<LigneSaisie>) {
    setV((x) => ({ ...x, lignes: x.lignes.map((l, k) => (k === i ? { ...l, ...champs } : l)) }));
  }

  function choisirProduit(i: number, id: string) {
    const p = produits.find((x) => x.id === id);
    if (p) majLigne(i, { productId: id, designation: p.nom, prix: String(p.prix_vente) });
    else majLigne(i, { productId: "" });
  }

  function ajouterLigne() {
    setV((x) => ({ ...x, lignes: [...x.lignes, { productId: "", designation: "", quantite: "1", prix: "" }] }));
    setCles((c) => [...c, prochaineCle.current++]);
  }

  function retirerLigne(i: number) {
    if (v.lignes.length <= 1) return;
    setV((x) => ({ ...x, lignes: x.lignes.filter((_, k) => k !== i) }));
    setCles((c) => c.filter((_, k) => k !== i));
  }

  const montantLigne = (l: LigneSaisie) => Math.round((Number(l.quantite) || 0) * (Number(l.prix) || 0));
  const sousTotal = v.lignes.reduce((s, l) => s + montantLigne(l), 0);
  const tauxTva = Number(v.tva) || 0;
  const valeurRemise = Number(v.remiseValeur) || 0;
  const totaux = calculerTotaux(sousTotal, v.remiseEnPourcent, valeurRemise, tauxTva);

  function verifier(): string | null {
    if (!v.clientNom.trim()) return "Indiquez le nom du client.";
    for (let i = 0; i < v.lignes.length; i++) {
      const l = v.lignes[i];
      if (!l.designation.trim()) return `Ligne ${i + 1} : indiquez la désignation.`;
      if (!(Number(l.quantite) > 0)) return `Ligne ${i + 1} : la quantité doit être supérieure à 0.`;
      if (l.prix === "" || !(Number(l.prix) >= 0)) return `Ligne ${i + 1} : indiquez le prix unitaire.`;
    }
    if (tauxTva < 0 || tauxTva > 100) return "Le taux de TVA doit être compris entre 0 et 100.";
    if (v.remiseEnPourcent && (valeurRemise < 0 || valeurRemise > 100)) return "La remise en pourcentage doit être comprise entre 0 et 100.";
    if (!v.remiseEnPourcent && valeurRemise > sousTotal) return "La remise ne peut pas dépasser le sous-total.";
    if (v.dateEcheance && v.dateFacture && v.dateEcheance < v.dateFacture) return "La date d'échéance ne peut pas être avant la date de la facture.";
    return null;
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const probleme = verifier();
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setEnvoi(true);
    const message = await enregistrer({
      p_customer: v.clientId || null,
      p_client_nom: v.clientNom.trim(),
      p_client_telephone: v.clientTel.trim() || null,
      p_client_adresse: v.clientAdresse.trim() || null,
      p_lignes: v.lignes.map((l) => ({
        product_id: l.productId || null,
        designation: l.designation.trim(),
        quantite: Number(l.quantite),
        prix_unitaire: Math.round(Number(l.prix)),
      })),
      p_remise_taux: v.remiseEnPourcent && valeurRemise > 0 ? valeurRemise : null,
      p_remise_montant: !v.remiseEnPourcent && valeurRemise > 0 ? Math.round(valeurRemise) : 0,
      p_tva_taux: tauxTva,
      p_date_facture: v.dateFacture || null,
      p_date_echeance: v.dateEcheance || null,
      p_note: v.note.trim() || null,
    });
    setEnvoi(false);
    if (message) setErreur(message);
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-xl mx-auto pb-28">
      <header className="mb-5">
        <a href={lienRetour[0]} className="inline-block py-1.5 text-xs font-semibold text-bronze">{lienRetour[1]}</a>
        <h1 className="font-display text-2xl font-bold text-indigo-deep">{titre}</h1>
      </header>

      <form onSubmit={envoyer} className="space-y-5">
        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Client</h2>
          {clients.length > 0 && (
            <select className="input-field" value={v.clientId} onChange={(e) => choisirClient(e.target.value)}>
              <option value="">Nouveau client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}
          <input className="input-field" placeholder="Nom du client" value={v.clientNom} onChange={(e) => maj({ clientNom: e.target.value })} />
          <input className="input-field" placeholder="Téléphone (facultatif)" inputMode="tel" value={v.clientTel} onChange={(e) => maj({ clientTel: e.target.value })} />
          <input className="input-field" placeholder="Adresse (facultatif)" value={v.clientAdresse} onChange={(e) => maj({ clientAdresse: e.target.value })} />
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Produits et services</h2>
          {v.lignes.map((l, i) => (
            <div key={cles[i]} className="bg-white border border-ink/10 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/60">N° {i + 1}</p>
                {v.lignes.length > 1 && (
                  <button type="button" onClick={() => retirerLigne(i)} className="text-sm font-medium text-clay py-1 px-2">
                    Retirer
                  </button>
                )}
              </div>
              {produits.length > 0 && (
                <select className="input-field" value={l.productId} onChange={(e) => choisirProduit(i, e.target.value)}>
                  <option value="">Ligne libre</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
              )}
              <input
                className="input-field"
                placeholder="Désignation (ex. Livraison, Réparation...)"
                value={l.designation}
                onChange={(e) => majLigne(i, { designation: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Quantité</label>
                  <input className="input-field" type="number" inputMode="decimal" min="0" step="any" value={l.quantite} onChange={(e) => majLigne(i, { quantite: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Prix unitaire (FCFA)</label>
                  <input className="input-field" type="number" inputMode="numeric" min="0" value={l.prix} onChange={(e) => majLigne(i, { prix: e.target.value })} />
                </div>
              </div>
              <p className="text-right text-sm text-ink/60">
                Montant : <span className="font-semibold text-indigo-deep">{fcfa(montantLigne(l))} FCFA</span>
              </p>
            </div>
          ))}
          <button type="button" onClick={ajouterLigne} className="w-full border-2 border-dashed border-ink/20 text-indigo-deep font-semibold rounded-2xl py-3">
            + Ajouter une ligne
          </button>
        </section>

        <section className="bg-white border border-ink/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setOptions((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-4 text-left"
            aria-expanded={options}
          >
            <span className="font-display font-bold text-indigo-deep">Remise, TVA, dates et note</span>
            <span className="text-sm font-semibold text-bronze">{options ? "Masquer" : "Ouvrir"}</span>
          </button>
          {options && (
            <div className="px-4 pb-4 space-y-4 border-t border-ink/10 pt-4">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Remise (facultatif)</label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input className="input-field" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={v.remiseValeur} onChange={(e) => maj({ remiseValeur: e.target.value })} />
                  <div className="flex rounded-xl overflow-hidden border border-ink/15">
                    <button type="button" onClick={() => maj({ remiseEnPourcent: true })} className={`px-3.5 text-sm font-semibold ${v.remiseEnPourcent ? "bg-indigo-deep text-bone" : "bg-white text-ink/60"}`}>%</button>
                    <button type="button" onClick={() => maj({ remiseEnPourcent: false })} className={`px-3.5 text-sm font-semibold ${!v.remiseEnPourcent ? "bg-indigo-deep text-bone" : "bg-white text-ink/60"}`}>FCFA</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">TVA (%) : laissez 0 si vous n&apos;en appliquez pas</label>
                <input className="input-field" type="number" inputMode="decimal" min="0" max="100" step="any" value={v.tva} onChange={(e) => maj({ tva: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Date de la facture</label>
                  <input className="input-field" type="date" value={v.dateFacture} onChange={(e) => maj({ dateFacture: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">À payer avant le</label>
                  <input className="input-field" type="date" value={v.dateEcheance} onChange={(e) => maj({ dateEcheance: e.target.value })} />
                </div>
              </div>
              <textarea className="input-field min-h-[80px]" placeholder="Note pour le client (facultatif)" value={v.note} onChange={(e) => maj({ note: e.target.value })} />
            </div>
          )}
        </section>

        <section className="bg-white border-2 border-bronze/60 rounded-2xl p-4 space-y-1">
          <div className="flex justify-between text-sm text-ink/70">
            <span>Sous-total</span>
            <span>{fcfa(sousTotal)} FCFA</span>
          </div>
          {totaux.remise > 0 && (
            <div className="flex justify-between text-sm text-bronze">
              <span>Remise</span>
              <span>- {fcfa(totaux.remise)} FCFA</span>
            </div>
          )}
          {tauxTva > 0 && (
            <div className="flex justify-between text-sm text-ink/70">
              <span>TVA ({tauxTva} %)</span>
              <span>{fcfa(totaux.tva)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-2 mt-1 border-t border-ink/10">
            <span className="font-semibold text-ink">Total à payer</span>
            <span className="font-display text-2xl font-bold text-indigo-deep">{fcfa(totaux.total)} FCFA</span>
          </div>
        </section>

        {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

        <button type="submit" disabled={envoi} className="w-full bg-bronze text-white font-display font-semibold text-lg rounded-2xl py-4 shadow-lg disabled:opacity-50">
          {envoi ? libelleEnCours : libelleBouton}
        </button>
      </form>
    </main>
  );
}
