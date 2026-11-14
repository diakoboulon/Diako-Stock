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

// ---- Montant en toutes lettres (« quarante-huit mille cinq cents ») ----
const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

function moinsDeCent(n: number): string {
  if (n < 17) return UNITES[n];
  if (n < 20) return "dix-" + UNITES[n - 10];
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return DIZAINES[d];
    if (u === 1) return DIZAINES[d] + " et un";
    return DIZAINES[d] + "-" + UNITES[u];
  }
  if (n < 80) {
    if (n === 71) return "soixante et onze";
    return "soixante-" + moinsDeCent(n - 60);
  }
  if (n === 80) return "quatre-vingts";
  return "quatre-vingt-" + moinsDeCent(n - 80);
}

// accorde = true : « cent » et « quatre-vingts » prennent un s quand rien ne les suit
function moinsDeMille(n: number, accorde: boolean): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c > 0) {
    if (c === 1) parts.push("cent");
    else parts.push(UNITES[c] + " cent" + (r === 0 && accorde ? "s" : ""));
  }
  if (r > 0) {
    let t = moinsDeCent(r);
    if (r === 80 && !accorde) t = "quatre-vingt";
    parts.push(t);
  }
  return parts.join(" ");
}

export function enLettres(valeur: number): string {
  const n = Math.floor(Math.abs(valeur));
  if (n === 0) return "zéro";
  if (n > 999999999999) return String(n);
  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;
  const morceaux: string[] = [];
  if (milliards) morceaux.push(moinsDeMille(milliards, true) + (milliards > 1 ? " milliards" : " milliard"));
  if (millions) morceaux.push(moinsDeMille(millions, true) + (millions > 1 ? " millions" : " million"));
  if (milliers) morceaux.push(milliers === 1 ? "mille" : moinsDeMille(milliers, false) + " mille");
  if (reste) morceaux.push(moinsDeMille(reste, true));
  return morceaux.join(" ");
}

// « Arrêtée la présente facture à la somme de ... francs CFA. »
export function phraseMontant(total: number): string {
  const n = Math.floor(Math.abs(total));
  const de = n > 0 && n % 1000000 === 0 ? " de" : "";
  return `${enLettres(n)}${de} francs CFA`;
}
