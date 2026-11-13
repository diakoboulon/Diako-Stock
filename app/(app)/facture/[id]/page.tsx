"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import {
  Facture,
  LigneFacture,
  PaiementFacture,
  MODES_PAIEMENT,
  fcfa,
  dateFr,
  numeroWhatsApp,
} from "@/lib/facture";
import { BadgeStatut, EcranBloque, useContexteFacture } from "../commun";

type Entreprise = { nom: string; ville: string | null; adresse: string | null; telephone: string | null };

export default function DetailFacture() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const ctx = useContexteFacture();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [lignes, setLignes] = useState<LigneFacture[]>([]);
  const [paiements, setPaiements] = useState<PaiementFacture[]>([]);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function charger(businessId: string) {
    const [{ data: f }, { data: l }, { data: p }, { data: e }] = await Promise.all([
      supabase.from("factures").select("*").eq("id", id).eq("business_id", businessId).maybeSingle(),
      supabase.from("facture_lignes").select("id, designation, quantite, prix_unitaire, total_ligne, ordre").eq("facture_id", id).order("ordre"),
      supabase.from("facture_paiements").select("id, montant, mode, created_at").eq("facture_id", id).order("created_at"),
      supabase.from("businesses").select("nom, ville, adresse, telephone").eq("id", businessId).maybeSingle(),
    ]);
    if (!f) {
      setIntrouvable(true);
    } else {
      setFacture(f as Facture);
      setLignes((l ?? []) as LigneFacture[]);
      setPaiements((p ?? []) as PaiementFacture[]);
      setEntreprise(e as Entreprise | null);
    }
    setChargement(false);
  }

  useEffect(() => {
    if (!ctx || !ctx.estProprietaire || !ctx.active || !id) return;
    charger(ctx.businessId);
  }, [ctx, id]);

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut consulter les factures." />;
  }
  if (!ctx.active) {
    return <EcranBloque titre="Diako Facture n'est pas activé" texte="Ce module n'est pas activé pour votre commerce." avecWhatsApp />;
  }
  if (chargement) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (introuvable || !facture) {
    return <EcranBloque titre="Facture introuvable" texte="Cette facture n'existe pas ou n'appartient pas à votre commerce." />;
  }

  const reste = facture.total - facture.montant_paye;
  const nomEntreprise = entreprise?.nom ?? ctx.nomCommerce;
  const peutEncaisser = facture.statut === "emise" || facture.statut === "partielle";

  const texteWhatsApp =
    `Bonjour ${facture.client_nom}, voici votre facture ${facture.numero} de ${nomEntreprise} : ` +
    `total ${fcfa(facture.total)} FCFA` +
    (peutEncaisser ? `, reste à payer ${fcfa(reste)} FCFA` : facture.statut === "payee" ? ", déjà payée" : "") +
    (peutEncaisser && facture.date_echeance ? `, à régler avant le ${dateFr(facture.date_echeance)}` : "") +
    ". Merci de votre confiance !";
  const numero = numeroWhatsApp(facture.client_telephone);
  const lienWhatsApp = `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texteWhatsApp)}`;

  async function annuler() {
    if (!window.confirm("Annuler cette facture ? Cette action est définitive.")) return;
    setMessage(null);
    const { error } = await supabase.rpc("annuler_facture", { p_business: ctx!.businessId, p_facture: facture!.id });
    if (error) {
      setMessage(enFrancais(error.message, "Impossible d'annuler la facture."));
      return;
    }
    await charger(ctx!.businessId);
  }

  return (
    <main className="min-h-screen bg-bone px-4 py-6 max-w-2xl mx-auto pb-20 print:bg-white print:p-0 print:max-w-none">
      <div className="print:hidden flex items-center justify-between mb-4">
        <a href="/facture" className="inline-block py-1.5 text-xs font-semibold text-bronze">← Mes factures</a>
        <BadgeStatut statut={facture.statut} />
      </div>

      {/* LA FACTURE (c'est cette partie qui s'imprime) */}
      <article className="bg-white border border-ink/10 rounded-3xl p-5 md:p-8 print:border-0 print:rounded-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold text-indigo-deep">{nomEntreprise}</p>
            <div className="text-sm text-ink/60 mt-1 space-y-0.5">
              {entreprise?.adresse && <p>{entreprise.adresse}</p>}
              {entreprise?.ville && <p>{entreprise.ville}</p>}
              {entreprise?.telephone && <p>Tél. : {entreprise.telephone}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-2xl font-bold text-bronze tracking-wide">FACTURE</p>
            <p className="font-semibold text-ink">{facture.numero}</p>
            <p className="text-sm text-ink/60">Date : {dateFr(facture.date_facture)}</p>
            {facture.date_echeance && <p className="text-sm text-ink/60">À payer avant le : {dateFr(facture.date_echeance)}</p>}
          </div>
        </div>

        <div className="mt-6 bg-bone rounded-2xl p-4 print:bg-transparent print:border print:border-ink/15">
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Facturé à</p>
          <p className="font-semibold text-ink mt-1">{facture.client_nom}</p>
          {facture.client_telephone && <p className="text-sm text-ink/60">{facture.client_telephone}</p>}
          {facture.client_adresse && <p className="text-sm text-ink/60">{facture.client_adresse}</p>}
        </div>

        <div className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
          {lignes.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{l.designation}</p>
                <p className="text-sm text-ink/50">
                  {l.quantite} × {fcfa(l.prix_unitaire)} FCFA
                </p>
              </div>
              <p className="font-semibold text-ink whitespace-nowrap">{fcfa(l.total_ligne)} FCFA</p>
            </div>
          ))}
        </div>

        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-ink/70">
            <span>Sous-total</span>
            <span>{fcfa(facture.sous_total)} FCFA</span>
          </div>
          {facture.tva_taux > 0 && (
            <div className="flex justify-between text-ink/70">
              <span>TVA ({facture.tva_taux} %)</span>
              <span>{fcfa(facture.tva_montant)} FCFA</span>
            </div>
          )}
          <div className="flex justify-between items-end pt-2 border-t border-ink/10">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-display text-xl font-bold text-indigo-deep">{fcfa(facture.total)} FCFA</span>
          </div>
          {facture.montant_paye > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Déjà payé</span>
              <span>{fcfa(facture.montant_paye)} FCFA</span>
            </div>
          )}
          {facture.statut !== "annulee" && reste > 0 && (
            <div className="flex justify-between font-semibold text-clay">
              <span>Reste à payer</span>
              <span>{fcfa(reste)} FCFA</span>
            </div>
          )}
          {facture.statut === "payee" && <p className="text-right font-semibold text-green-700 pt-1">Facture payée, merci !</p>}
          {facture.statut === "annulee" && <p className="text-right font-semibold text-ink/50 pt-1">Facture annulée</p>}
        </div>

        {facture.note && <p className="mt-5 text-sm text-ink/70 whitespace-pre-line">{facture.note}</p>}
      </article>

      {/* ACTIONS (cachées à l'impression) */}
      <div className="print:hidden mt-5 space-y-3">
        {message && <p className="text-clay text-sm font-medium">{message}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.print()} className="bg-white border-2 border-indigo-deep/20 text-indigo-deep font-display font-semibold rounded-2xl py-3.5">
            Imprimer / PDF
          </button>
          <a href={lienWhatsApp} target="_blank" rel="noopener noreferrer" className="text-center bg-white border-2 border-green-600/30 text-green-700 font-display font-semibold rounded-2xl py-3.5">
            Envoyer sur WhatsApp
          </a>
        </div>

        {peutEncaisser && (
          <button onClick={() => setPaiementOuvert(true)} className="w-full bg-bronze text-white font-display font-semibold text-lg rounded-2xl py-4 shadow-lg">
            Enregistrer un paiement
          </button>
        )}

        {facture.statut === "emise" && (
          <button onClick={annuler} className="w-full text-clay font-medium py-2">
            Annuler cette facture
          </button>
        )}

        {paiements.length > 0 && (
          <section className="bg-white border border-ink/10 rounded-2xl p-4">
            <h2 className="font-display font-bold text-indigo-deep mb-2">Paiements reçus</h2>
            <div className="divide-y divide-ink/10">
              {paiements.map((p) => (
                <div key={p.id} className="flex justify-between py-2 text-sm">
                  <span className="text-ink/60">
                    {dateFr(p.created_at)}
                    {p.mode ? ` · ${p.mode}` : ""}
                  </span>
                  <span className="font-semibold text-green-700">{fcfa(p.montant)} FCFA</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {paiementOuvert && (
        <FormulairePaiement
          businessId={ctx.businessId}
          factureId={facture.id}
          reste={reste}
          onFerme={() => setPaiementOuvert(false)}
          onFait={async () => {
            setPaiementOuvert(false);
            await charger(ctx.businessId);
          }}
        />
      )}
    </main>
  );
}

function FormulairePaiement({
  businessId,
  factureId,
  reste,
  onFerme,
  onFait,
}: {
  businessId: string;
  factureId: string;
  reste: number;
  onFerme: () => void;
  onFait: () => void;
}) {
  const [montant, setMontant] = useState(String(reste));
  const [mode, setMode] = useState(MODES_PAIEMENT[0]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const identifiant = useRef<string | null>(null);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const somme = Math.round(Number(montant));
    if (!Number.isFinite(somme) || somme <= 0) {
      setErreur("Entrez un montant valide.");
      return;
    }
    if (somme > reste) {
      setErreur(`Il ne reste que ${fcfa(reste)} FCFA à payer.`);
      return;
    }
    if (!identifiant.current) identifiant.current = crypto.randomUUID();

    setEnvoi(true);
    const { error } = await supabase.rpc("enregistrer_paiement_facture", {
      p_business: businessId,
      p_facture: factureId,
      p_montant: somme,
      p_mode: mode,
      p_client_uuid: identifiant.current,
    });
    setEnvoi(false);
    if (error) {
      setErreur(enFrancais(error.message, "Impossible d'enregistrer le paiement."));
      return;
    }
    onFait();
  }

  return (
    <div className="print:hidden fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bone rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6">
        <h2 className="font-display text-xl font-bold text-indigo-deep">Enregistrer un paiement</h2>
        <p className="text-sm text-ink/60 mt-1 mb-4">
          Il reste <span className="font-semibold text-clay">{fcfa(reste)} FCFA</span> à payer.
        </p>
        <form onSubmit={valider} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-ink/70">Montant reçu (FCFA)</label>
            <input className="input-field mt-1" type="number" inputMode="numeric" min={1} max={reste} value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
          <button type="button" onClick={() => setMontant(String(reste))} className="text-sm font-medium text-indigo-deep underline">
            Le client paie tout ({fcfa(reste)} FCFA)
          </button>
          <div>
            <label className="text-sm font-medium text-ink/70">Mode de paiement</label>
            <select className="input-field mt-1" value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onFerme} className="flex-1 py-3 rounded-xl border border-ink/15 font-medium text-ink/70">
              Annuler
            </button>
            <button type="submit" disabled={envoi} className="flex-1 bg-bronze text-white font-display font-semibold rounded-xl py-3 disabled:opacity-50">
              {envoi ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
