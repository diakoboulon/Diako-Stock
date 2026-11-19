"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { genererPdfFacture, nomFichierPdf, partagerPdf, telechargerPdf } from "@/lib/pdf";
import {
  Entreprise,
  Facture,
  LigneFacture,
  MODES_PAIEMENT,
  PaiementFacture,
  dateFr,
  fcfa,
  numeroWhatsApp,
  phraseMontant,
} from "@/lib/facture";
import { EcranBloque, useContexteFacture } from "../commun";

const NAVY = "text-[#14284B]";
const IMPRESSION_COULEURS = "[print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

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
      supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
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

  const f = facture;
  const reste = f.total - f.montant_paye;
  const nomEntreprise = entreprise?.nom ?? ctx.nomCommerce;
  const peutEncaisser = f.statut === "emise" || f.statut === "partielle";
  const peutModifier = f.statut === "emise" && f.montant_paye === 0 && ctx.moduleActif;
  const remise = f.remise_montant ?? 0;

  const texteWhatsApp =
    `Bonjour ${f.client_nom}, voici votre facture ${f.numero} de ${nomEntreprise} : ` +
    `total ${fcfa(f.total)} FCFA` +
    (peutEncaisser && f.montant_paye > 0 ? `, reste à payer ${fcfa(reste)} FCFA` : f.statut === "payee" ? ", déjà payée" : "") +
    (peutEncaisser && f.date_echeance ? `, à régler avant le ${dateFr(f.date_echeance)}` : "") +
    ". Merci de votre confiance !";
  const numero = numeroWhatsApp(f.client_telephone);
  const lienWhatsApp = `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texteWhatsApp)}`;

  function fabriquerPdf() {
    return genererPdfFacture({ facture: f, lignes, entreprise, nomEntreprise });
  }

  function telecharger() {
    setMessage(null);
    try {
      telechargerPdf(fabriquerPdf(), nomFichierPdf(f));
    } catch {
      setMessage("Le PDF n'a pas pu être créé. Utilisez « Imprimer » puis « Enregistrer au format PDF ».");
    }
  }

  async function envoyerWhatsApp() {
    setMessage(null);
    try {
      const partage = await partagerPdf(fabriquerPdf(), nomFichierPdf(f), texteWhatsApp);
      if (partage) return;
    } catch {
      // on bascule sur le simple message
    }
    window.open(lienWhatsApp, "_blank", "noopener,noreferrer");
  }

  async function annuler() {
    if (!window.confirm("Annuler cette facture ? Cette action est définitive.")) return;
    setMessage(null);
    const { error } = await supabase.rpc("annuler_facture", { p_business: ctx!.businessId, p_facture: f.id });
    if (error) {
      setMessage(enFrancais(error.message, "Impossible d'annuler la facture."));
      return;
    }
    await charger(ctx!.businessId);
  }

  const etiquette: Record<string, string> = { payee: "Facture payée", partielle: "Payée en partie", annulee: "Facture annulée", emise: "À payer" };
  const adresse = [entreprise?.adresse, entreprise?.ville].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-bone px-3 sm:px-4 py-5 max-w-3xl mx-auto pb-20 print:bg-white print:p-0 print:max-w-none">
      <style>{"@media print { @page { size: A4; margin: 12mm; } }"}</style>

      <div className="print:hidden flex items-center justify-between mb-3 px-1">
        <a href="/facture" className="inline-block py-1.5 text-xs font-semibold text-bronze">← Mes factures</a>
        <span className="text-xs font-semibold rounded-full bg-white border border-ink/10 px-3 py-1 text-ink/70">{etiquette[f.statut]}</span>
      </div>

      {/* LA FACTURE : c'est cette partie qui est imprimée et téléchargée */}
      <article className="bg-white border border-[#E7E3D8] rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-9 print:border-0 print:rounded-none print:p-0 print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-5">
          <div className="min-w-0">
            {entreprise?.logo_data && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entreprise.logo_data} alt="Logo" className="max-h-14 max-w-[150px] object-contain mb-2" />
            )}
            <p className={`font-display text-xl font-bold ${NAVY}`}>{nomEntreprise}</p>
            <div className="text-[13px] text-[#5B616B] mt-1 space-y-0.5">
              {adresse && <p>{adresse}</p>}
              {entreprise?.telephone && <p>Tél. : {entreprise.telephone}</p>}
              {entreprise?.email && <p>E-mail : {entreprise.email}</p>}
              {(entreprise?.nif || entreprise?.rccm) && (
                <p>
                  {entreprise?.nif ? `NIF : ${entreprise.nif}` : ""}
                  {entreprise?.nif && entreprise?.rccm ? "   " : ""}
                  {entreprise?.rccm ? `RCCM : ${entreprise.rccm}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="sm:text-right">
            <p className={`font-display text-3xl font-bold tracking-wide ${NAVY}`}>FACTURE</p>
            <div className="h-[3px] w-12 bg-[#C9A24B] mt-1 sm:ml-auto" />
            <p className={`font-semibold mt-3 ${NAVY}`}>N° {f.numero}</p>
            <p className="text-sm text-[#3A3F47]">Date d&apos;émission : {dateFr(f.date_facture)}</p>
            {f.date_echeance && <p className="text-sm text-[#3A3F47]">Échéance : {dateFr(f.date_echeance)}</p>}
            {f.statut !== "emise" && <p className="text-xs font-bold uppercase text-[#9A7424] mt-1">{etiquette[f.statut]}</p>}
          </div>
        </div>

        <div className="h-px bg-[#C9A24B] mt-5" />

        <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-4 items-start">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-[#9A7424]">FACTURÉ À</p>
            <p className={`font-semibold text-lg ${NAVY}`}>{f.client_nom}</p>
            {f.client_telephone && <p className="text-sm text-[#3A3F47]">{f.client_telephone}</p>}
            {f.client_adresse && <p className="text-sm text-[#3A3F47]">{f.client_adresse}</p>}
          </div>
          <div className={`bg-[#F6F3EC] border-l-[3px] border-[#C9A24B] px-4 py-3 sm:min-w-[210px] ${IMPRESSION_COULEURS}`}>
            <p className="text-[11px] font-bold tracking-wider text-[#5B616B]">
              {f.statut === "payee" ? "MONTANT RÉGLÉ" : f.montant_paye > 0 && f.statut !== "annulee" ? "RESTE À PAYER" : "TOTAL À PAYER"}
            </p>
            <p className={`font-display text-2xl font-bold ${NAVY}`}>
              {fcfa(f.montant_paye > 0 && f.statut !== "annulee" && f.statut !== "payee" ? reste : f.total)} FCFA
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#14284B]/20 print:rounded-none">
          <table className="w-full text-[12.5px] sm:text-sm">
            <thead>
              <tr className={`bg-[#14284B] text-white text-left align-bottom ${IMPRESSION_COULEURS}`}>
                <th className="w-7 sm:w-10 px-1 sm:px-3 py-2.5 font-semibold text-center">N°</th>
                <th className="px-1.5 sm:px-3 py-2.5 font-semibold">Désignation</th>
                <th className="px-1 sm:px-3 py-2.5 font-semibold text-center">Quantité</th>
                <th className="px-1 sm:px-3 py-2.5 font-semibold text-right">
                  Prix unitaire<span className="block text-[10px] sm:text-xs font-normal opacity-80">(FCFA)</span>
                </th>
                <th className="px-1.5 sm:px-3 py-2.5 font-semibold text-right">
                  Montant<span className="block text-[10px] sm:text-xs font-normal opacity-80">(FCFA)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={l.id} className={`border-t border-[#E7E3D8] align-top ${i % 2 === 1 ? "bg-[#FAF8F3]" : ""} ${IMPRESSION_COULEURS}`}>
                  <td className="px-1 sm:px-3 py-2.5 text-center text-[#5B616B]">{i + 1}</td>
                  <td className="px-1.5 sm:px-3 py-2.5 font-medium text-[#1B2333]">{l.designation}</td>
                  <td className="px-1 sm:px-3 py-2.5 text-center">{Number(l.quantite).toLocaleString("fr-FR")}</td>
                  <td className="px-1 sm:px-3 py-2.5 text-right whitespace-nowrap">{fcfa(l.prix_unitaire)}</td>
                  <td className={`px-1.5 sm:px-3 py-2.5 text-right font-semibold whitespace-nowrap ${NAVY}`}>{fcfa(l.total_ligne)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-5">
          <div className="text-sm order-2 sm:order-1">
            <p className="text-[11px] font-bold tracking-wider text-[#9A7424]">MOYENS DE PAIEMENT</p>
            <p className="text-[#3A3F47] mt-1">{MODES_PAIEMENT.join("  ·  ")}</p>
            {entreprise?.infos_paiement && <p className={`font-semibold mt-2 whitespace-pre-line ${NAVY}`}>{entreprise.infos_paiement}</p>}
          </div>
          <div className="text-sm space-y-1 order-1 sm:order-2">
            <div className="flex justify-between text-[#3A3F47]">
              <span>Sous-total</span>
              <span>{fcfa(f.sous_total)} FCFA</span>
            </div>
            {remise > 0 && (
              <div className="flex justify-between text-[#9A7424]">
                <span>Remise{f.remise_taux ? ` (${Number(f.remise_taux).toLocaleString("fr-FR")} %)` : ""}</span>
                <span>- {fcfa(remise)} FCFA</span>
              </div>
            )}
            {f.tva_taux > 0 && (
              <div className="flex justify-between text-[#3A3F47]">
                <span>TVA ({Number(f.tva_taux).toLocaleString("fr-FR")} %)</span>
                <span>{fcfa(f.tva_montant)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-2 mt-1 border-t border-[#E7E3D8]">
              <span className={`font-bold ${NAVY}`}>Total à payer</span>
              <span className={`font-display text-xl font-bold ${NAVY}`}>{fcfa(f.total)} FCFA</span>
            </div>
            <div className="h-[3px] w-12 bg-[#C9A24B]" />
            {f.montant_paye > 0 && f.statut !== "annulee" && (
              <>
                <div className="flex justify-between text-green-700 pt-1">
                  <span>Montant payé</span>
                  <span>{fcfa(f.montant_paye)} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-[#9A7424]">
                  <span>Reste à payer</span>
                  <span>{fcfa(reste)} FCFA</span>
                </div>
              </>
            )}
          </div>
        </div>

        {f.statut !== "annulee" && (
          <p className="mt-6 text-sm text-[#5B616B]">
            Arrêtée la présente facture à la somme de :
            <strong className={`block text-base mt-0.5 ${NAVY}`}>{phraseMontant(f.total).replace(/^./, (x) => x.toUpperCase())}.</strong>
          </p>
        )}

        {f.note && (
          <div className="mt-4 text-sm">
            <p className="text-[11px] font-bold tracking-wider text-[#9A7424]">NOTE</p>
            <p className="text-[#3A3F47] whitespace-pre-line">{f.note}</p>
          </div>
        )}

        <div className="hidden print:flex justify-end mt-12 text-sm text-[#5B616B]">
          <div className="w-56 border-t border-[#3A3F47]/40 pt-2 text-center">Cachet et signature</div>
        </div>
        <p className="hidden print:block text-[11px] text-[#5B616B] mt-8 border-t border-[#E7E3D8] pt-2">
          DIAKO BUSINESS · La technologie au service de vos affaires.
        </p>
      </article>

      {/* ACTIONS (cachées à l'impression) */}
      <div className="print:hidden mt-5 space-y-3">
        {message && <p className="text-clay text-sm font-medium">{message}</p>}

        <button onClick={telecharger} className="w-full bg-[#C9A24B] text-[#14284B] font-display font-semibold text-lg rounded-2xl py-4 shadow-lg shadow-[#C9A24B]/30">
          Télécharger en PDF
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={envoyerWhatsApp} className="bg-white border-2 border-green-600/30 text-green-700 font-display font-semibold rounded-2xl py-3.5">
            Envoyer sur WhatsApp
          </button>
          <button onClick={() => window.print()} className="bg-white border-2 border-[#14284B]/20 text-[#14284B] font-display font-semibold rounded-2xl py-3.5">
            Imprimer (A4)
          </button>
        </div>

        {peutEncaisser && (
          <button onClick={() => setPaiementOuvert(true)} className="w-full bg-[#14284B] text-white font-display font-semibold text-lg rounded-2xl py-4">
            Enregistrer un paiement
          </button>
        )}

        <div className="flex items-center justify-center gap-6 pt-1">
          {peutModifier && (
            <a href={`/facture/${f.id}/modifier`} className="text-[#14284B] font-semibold underline underline-offset-4 py-2">
              Modifier la facture
            </a>
          )}
          {f.statut === "emise" && (
            <button onClick={annuler} className="text-clay font-medium py-2">
              Annuler la facture
            </button>
          )}
        </div>

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
          factureId={f.id}
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
