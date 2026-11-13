"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { fcfa } from "@/lib/facture";
import { EcranBloque, useContexteFacture } from "../commun";

type Client = { id: string; nom: string; telephone: string | null; whatsapp: string | null; adresse: string | null };
type Produit = { id: string; nom: string; prix_vente: number };
type Ligne = { cle: number; productId: string; designation: string; quantite: string; prix: string };

export default function NouvelleFacture() {
  const router = useRouter();
  const ctx = useContexteFacture();
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);

  const [clientId, setClientId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ cle: 1, productId: "", designation: "", quantite: "1", prix: "" }]);
  const [tva, setTva] = useState("0");
  const [echeance, setEcheance] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const prochaineCle = useRef(2);
  const identifiantUnique = useRef<string | null>(null);

  useEffect(() => {
    if (!ctx || !ctx.estProprietaire || !ctx.moduleActif) return;
    async function charger() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase
          .from("customers")
          .select("id, nom, telephone, whatsapp, adresse")
          .eq("business_id", ctx!.businessId)
          .eq("actif", true)
          .order("nom"),
        supabase
          .from("products")
          .select("id, nom, prix_vente")
          .eq("business_id", ctx!.businessId)
          .eq("actif", true)
          .order("nom"),
      ]);
      setClients((c ?? []) as Client[]);
      setProduits((p ?? []) as Produit[]);
    }
    charger();
  }, [ctx]);

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut créer des factures." />;
  }
  if (!ctx.moduleActif) {
    return (
      <EcranBloque
        titre="Création impossible"
        texte="Votre essai de Diako Facture est terminé. Écrivez-nous sur WhatsApp pour vous abonner."
        avecWhatsApp
      />
    );
  }

  function choisirClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      setClientNom(c.nom);
      setClientTel(c.telephone || c.whatsapp || "");
      setClientAdresse(c.adresse || "");
    } else {
      setClientNom("");
      setClientTel("");
      setClientAdresse("");
    }
  }

  function modifierLigne(cle: number, champs: Partial<Ligne>) {
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...champs } : l)));
  }

  function choisirProduit(cle: number, id: string) {
    const p = produits.find((x) => x.id === id);
    if (p) modifierLigne(cle, { productId: id, designation: p.nom, prix: String(p.prix_vente) });
    else modifierLigne(cle, { productId: "" });
  }

  function ajouterLigne() {
    setLignes((ls) => [...ls, { cle: prochaineCle.current++, productId: "", designation: "", quantite: "1", prix: "" }]);
  }

  function retirerLigne(cle: number) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((l) => l.cle !== cle) : ls));
  }

  const totalLigne = (l: Ligne) => Math.round((Number(l.quantite) || 0) * (Number(l.prix) || 0));
  const sousTotal = lignes.reduce((s, l) => s + totalLigne(l), 0);
  const tauxTva = Number(tva) || 0;
  const montantTva = Math.round((sousTotal * tauxTva) / 100);
  const total = sousTotal + montantTva;

  function verifier(): string | null {
    if (!clientNom.trim()) return "Indiquez le nom du client.";
    if (tauxTva < 0 || tauxTva > 100) return "Le taux de TVA doit être compris entre 0 et 100.";
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      if (!l.designation.trim()) return `Ligne ${i + 1} : indiquez ce que vous facturez.`;
      if (!(Number(l.quantite) > 0)) return `Ligne ${i + 1} : la quantité doit être supérieure à 0.`;
      if (!(Number(l.prix) >= 0) || l.prix === "") return `Ligne ${i + 1} : indiquez le prix.`;
    }
    return null;
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const probleme = verifier();
    if (probleme) {
      setErreur(probleme);
      return;
    }
    if (!identifiantUnique.current) identifiantUnique.current = crypto.randomUUID();

    setEnvoi(true);
    const { data, error } = await supabase.rpc("creer_facture", {
      p_business: ctx!.businessId,
      p_customer: clientId || null,
      p_client_nom: clientNom.trim(),
      p_client_telephone: clientTel.trim() || null,
      p_client_adresse: clientAdresse.trim() || null,
      p_lignes: lignes.map((l) => ({
        product_id: l.productId || null,
        designation: l.designation.trim(),
        quantite: Number(l.quantite),
        prix_unitaire: Math.round(Number(l.prix)),
      })),
      p_tva_taux: tauxTva,
      p_date_echeance: echeance || null,
      p_note: note.trim() || null,
      p_client_uuid: identifiantUnique.current,
    });
    setEnvoi(false);

    if (error) {
      setErreur(enFrancais(error.message, "Impossible de créer la facture. Veuillez réessayer."));
      return;
    }
    router.push(`/facture/${data}`);
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-xl mx-auto pb-28">
      <header className="mb-5">
        <a href="/facture" className="inline-block py-1.5 text-xs font-semibold text-bronze">← Mes factures</a>
        <h1 className="font-display text-2xl font-bold text-indigo-deep">Nouvelle facture</h1>
      </header>

      <form onSubmit={creer} className="space-y-5">
        {/* Client */}
        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Client</h2>
          {clients.length > 0 && (
            <select className="input-field" value={clientId} onChange={(e) => choisirClient(e.target.value)}>
              <option value="">Nouveau client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}
          <input className="input-field" placeholder="Nom du client" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
          <input className="input-field" placeholder="Téléphone (facultatif)" inputMode="tel" value={clientTel} onChange={(e) => setClientTel(e.target.value)} />
          <input className="input-field" placeholder="Adresse (facultatif)" value={clientAdresse} onChange={(e) => setClientAdresse(e.target.value)} />
        </section>

        {/* Lignes */}
        <section className="space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Ce que vous facturez</h2>
          {lignes.map((l, i) => (
            <div key={l.cle} className="bg-white border border-ink/10 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/60">Ligne {i + 1}</p>
                {lignes.length > 1 && (
                  <button type="button" onClick={() => retirerLigne(l.cle)} className="text-sm font-medium text-clay py-1 px-2">
                    Retirer
                  </button>
                )}
              </div>
              {produits.length > 0 && (
                <select className="input-field" value={l.productId} onChange={(e) => choisirProduit(l.cle, e.target.value)}>
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
                onChange={(e) => modifierLigne(l.cle, { designation: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Quantité</label>
                  <input
                    className="input-field"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={l.quantite}
                    onChange={(e) => modifierLigne(l.cle, { quantite: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Prix unitaire (FCFA)</label>
                  <input
                    className="input-field"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={l.prix}
                    onChange={(e) => modifierLigne(l.cle, { prix: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-right text-sm text-ink/60">
                Total de la ligne : <span className="font-semibold text-indigo-deep">{fcfa(totalLigne(l))} FCFA</span>
              </p>
            </div>
          ))}
          <button
            type="button"
            onClick={ajouterLigne}
            className="w-full border-2 border-dashed border-ink/20 text-indigo-deep font-semibold rounded-2xl py-3"
          >
            + Ajouter une ligne
          </button>
        </section>

        {/* Détails */}
        <section className="bg-white border border-ink/10 rounded-2xl p-4 space-y-3">
          <h2 className="font-display font-bold text-indigo-deep">Détails</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">TVA (%) — 0 si aucune</label>
              <input className="input-field" type="number" inputMode="decimal" min="0" max="100" step="any" value={tva} onChange={(e) => setTva(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">À payer avant le</label>
              <input className="input-field" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
          </div>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="Note pour le client (facultatif)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        {/* Totaux */}
        <section className="bg-white border-2 border-bronze/60 rounded-2xl p-4">
          <div className="flex justify-between text-sm text-ink/70">
            <span>Sous-total</span>
            <span>{fcfa(sousTotal)} FCFA</span>
          </div>
          {tauxTva > 0 && (
            <div className="flex justify-between text-sm text-ink/70 mt-1">
              <span>TVA ({tauxTva} %)</span>
              <span>{fcfa(montantTva)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between items-end mt-2 pt-2 border-t border-ink/10">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-display text-2xl font-bold text-indigo-deep">{fcfa(total)} FCFA</span>
          </div>
        </section>

        {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full bg-bronze text-white font-display font-semibold text-lg rounded-2xl py-4 shadow-lg disabled:opacity-50"
        >
          {envoi ? "Création en cours..." : "Créer la facture"}
        </button>
      </form>
    </main>
  );
}
