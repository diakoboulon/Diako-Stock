// Types et petits outils partagés par les écrans de Diako Facture.

export type StatutFacture = "emise" | "partielle" | "payee" | "annulee";

export type Facture = {
  id: string;
  numero: string;
  customer_id: string | null;
  client_nom: string;
  client_telephone: string | null;
  client_adresse: string | null;
  date_facture: string;
  date_echeance: string | null;
  tva_taux: number;
  sous_total: number;
  tva_montant: number;
  total: number;
  montant_paye: number;
  statut: StatutFacture;
  note: string | null;
  created_at: string;
};

export type LigneFacture = {
  id: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
  ordre: number;
};

export type PaiementFacture = {
  id: string;
  montant: number;
  mode: string | null;
  created_at: string;
};

export const STATUTS_FACTURE: Record<string, string> = {
  emise: "À payer",
  partielle: "Payée en partie",
  payee: "Payée",
  annulee: "Annulée",
};

export const MODES_PAIEMENT = ["Espèces", "Orange Money", "Moov Money", "Wave", "Virement", "Chèque", "Autre"];

export const fcfa = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

export const dateFr = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export const joursRestants = (fin: string | null | undefined) =>
  fin ? Math.max(0, Math.ceil((new Date(fin).getTime() - Date.now()) / 86400000)) : 0;

// Numéro WhatsApp : 8 chiffres = numéro malien sans indicatif.
export function numeroWhatsApp(telephone: string | null | undefined): string | null {
  const brut = (telephone ?? "").replace(/[^\d+]/g, "");
  if (!brut) return null;
  let numero = brut.startsWith("+") ? brut.slice(1) : brut.startsWith("00") ? brut.slice(2) : brut;
  if (numero.length === 8) numero = "223" + numero;
  return numero;
}
