// Fabrique la facture au format PDF (A4), sans bibliothèque externe.
// Les polices utilisées (Helvetica) sont intégrées à tous les lecteurs PDF.

import { Entreprise, Facture, LigneFacture, MODES_PAIEMENT, dateFr, phraseMontant } from "./facture";

const LARG_REG: number[] = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 750, 556, 556, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556, 556, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 556, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 0, 737, 552, 400, 549, 333, 333, 333, 576, 537, 333, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 549, 611, 556, 556, 556, 556, 500, 556, 500];
const LARG_BOLD: number[] = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 750, 556, 556, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556, 556, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 556, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 0, 737, 552, 400, 549, 333, 333, 333, 576, 556, 333, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 549, 611, 611, 611, 611, 611, 556, 611, 556];

const CP1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99, "œ": 0x9c, "Œ": 0x8c, "š": 0x9a, "Š": 0x8a,
};

function codeCar(c: string): number {
  const n = c.charCodeAt(0);
  if (n >= 32 && n < 127) return n;
  if (n >= 160 && n <= 255) return n;
  return CP1252[c] ?? 63;
}

function largeur(texte: string, taille: number, gras = false): number {
  const table = gras ? LARG_BOLD : LARG_REG;
  let total = 0;
  for (let i = 0; i < texte.length; i++) total += table[codeCar(texte[i]) - 32] ?? 556;
  return (total / 1000) * taille;
}

function hex(texte: string): string {
  let r = "";
  for (let i = 0; i < texte.length; i++) r += codeCar(texte[i]).toString(16).padStart(2, "0");
  return r.toUpperCase();
}

function couper(texte: string, taille: number, gras: boolean, max: number): string[] {
  const lignes: string[] = [];
  for (const p of texte.split(/\r?\n/)) {
    let courant = "";
    for (const mot of p.split(" ")) {
      const essai = courant ? courant + " " + mot : mot;
      if (largeur(essai, taille, gras) <= max || !courant) {
        courant = essai;
      } else {
        lignes.push(courant);
        courant = mot;
      }
    }
    lignes.push(courant);
  }
  return lignes;
}

const nombre = (n: number) => Number(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");

type Couleur = [number, number, number];
const NAVY: Couleur = [0.078, 0.157, 0.294];
const OR: Couleur = [0.788, 0.635, 0.294];
const OR_FONCE: Couleur = [0.604, 0.455, 0.141];
const TEXTE: Couleur = [0.16, 0.18, 0.22];
const GRIS: Couleur = [0.42, 0.44, 0.49];
const FILET: Couleur = [0.86, 0.85, 0.8];
const FOND: Couleur = [0.965, 0.955, 0.925];
const BLANC: Couleur = [1, 1, 1];
const VERT: Couleur = [0.12, 0.45, 0.28];

function infosJpeg(o: Uint8Array): { w: number; h: number; composantes: number } | null {
  if (o.length < 4 || o[0] !== 0xff || o[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < o.length) {
    if (o[i] !== 0xff) {
      i++;
      continue;
    }
    const m = o[i + 1];
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      i += 2;
      continue;
    }
    const longueur = (o[i + 2] << 8) | o[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: (o[i + 5] << 8) | o[i + 6], w: (o[i + 7] << 8) | o[i + 8], composantes: o[i + 9] };
    }
    i += 2 + longueur;
  }
  return null;
}

function logoDepuisDonnees(logo: string | null | undefined) {
  if (!logo || !logo.startsWith("data:image/jpeg;base64,")) return null;
  try {
    const bin = atob(logo.slice("data:image/jpeg;base64,".length));
    const octets = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
    const infos = infosJpeg(octets);
    return infos ? { octets, ...infos } : null;
  } catch {
    return null;
  }
}

const L = 595.28;
const H = 841.89;
const MARGE = 42;

export type DonneesFacturePdf = {
  facture: Facture;
  lignes: LigneFacture[];
  entreprise: Entreprise | null;
  nomEntreprise: string;
};

export function genererPdfFacture(d: DonneesFacturePdf): Uint8Array {
  const { facture: f, lignes, entreprise: e } = d;
  const logo = logoDepuisDonnees(e?.logo_data);

  const pages: string[][] = [];
  let ops: string[] = [];
  function nouvellePage() {
    ops = [];
    pages.push(ops);
  }
  nouvellePage();

  const c = (col: Couleur) => `${col[0].toFixed(3)} ${col[1].toFixed(3)} ${col[2].toFixed(3)}`;
  const Y = (yHaut: number) => (H - yHaut).toFixed(2);

  function rect(x: number, yHaut: number, w: number, h: number, col: Couleur) {
    ops.push(`${c(col)} rg ${x.toFixed(2)} ${(H - yHaut - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  function filet(x1: number, y: number, x2: number, col: Couleur, epaisseur = 0.6) {
    ops.push(`${epaisseur} w ${c(col)} RG ${x1.toFixed(2)} ${Y(y)} m ${x2.toFixed(2)} ${Y(y)} l S`);
  }
  function texte(x: number, yBase: number, t: string, taille: number, col: Couleur, gras = false, align: "g" | "d" | "c" = "g") {
    if (!t) return;
    const w = largeur(t, taille, gras);
    const xx = align === "d" ? x - w : align === "c" ? x - w / 2 : x;
    ops.push(`BT /${gras ? "F2" : "F1"} ${taille} Tf ${c(col)} rg ${xx.toFixed(2)} ${Y(yBase)} Td <${hex(t)}> Tj ET`);
  }
  function paragraphe(x: number, yBase: number, t: string, taille: number, col: Couleur, max: number, gras = false): number {
    let y = yBase;
    for (const ligne of couper(t, taille, gras, max)) {
      texte(x, y, ligne, taille, col, gras);
      y += taille * 1.35;
    }
    return y;
  }

  // ---------- En-tête : entreprise (gauche) et facture (droite) ----------
  let yG = MARGE;
  if (logo) {
    const echelle = Math.min(120 / logo.w, 56 / logo.h);
    const lw = logo.w * echelle;
    const lh = logo.h * echelle;
    ops.push(`q ${lw.toFixed(2)} 0 0 ${lh.toFixed(2)} ${MARGE} ${(H - yG - lh).toFixed(2)} cm /Im1 Do Q`);
    yG += lh + 14;
  } else {
    yG += 12;
  }
  texte(MARGE, yG, d.nomEntreprise, 16, NAVY, true);
  yG += 17;
  const adr = [e?.adresse, e?.ville].filter(Boolean).join(", ");
  if (adr) yG = paragraphe(MARGE, yG, adr, 9, GRIS, 250);
  if (e?.telephone) {
    texte(MARGE, yG, "Tél. : " + e.telephone, 9, GRIS);
    yG += 12.5;
  }
  if (e?.email) {
    texte(MARGE, yG, "E-mail : " + e.email, 9, GRIS);
    yG += 12.5;
  }
  const legal = [e?.nif ? "NIF : " + e.nif : "", e?.rccm ? "RCCM : " + e.rccm : ""].filter(Boolean).join("   ");
  if (legal) {
    texte(MARGE, yG, legal, 9, GRIS);
    yG += 12.5;
  }

  const xD = L - MARGE;
  texte(xD, MARGE + 22, "FACTURE", 26, NAVY, true, "d");
  rect(xD - 46, MARGE + 30, 46, 3, OR);
  texte(xD, MARGE + 52, "N° " + f.numero, 11, NAVY, true, "d");
  texte(xD, MARGE + 68, "Date d'émission : " + dateFr(f.date_facture), 9.5, TEXTE, false, "d");
  let yD = MARGE + 82;
  if (f.date_echeance) {
    texte(xD, yD, "Échéance : " + dateFr(f.date_echeance), 9.5, TEXTE, false, "d");
    yD += 14;
  }
  const etiquettes: Record<string, string> = { payee: "FACTURE PAYÉE", partielle: "PAYÉE EN PARTIE", annulee: "FACTURE ANNULÉE" };
  if (etiquettes[f.statut]) {
    texte(xD, yD + 2, etiquettes[f.statut], 9, OR_FONCE, true, "d");
    yD += 16;
  }

  let y = Math.max(yG, yD) + 10;
  filet(MARGE, y, L - MARGE, OR, 1);

  // ---------- Client et résumé ----------
  y += 24;
  texte(MARGE, y, "FACTURÉ À", 8, OR_FONCE, true);
  let yC = y + 16;
  texte(MARGE, yC, f.client_nom, 12, NAVY, true);
  yC += 15;
  if (f.client_telephone) {
    texte(MARGE, yC, f.client_telephone, 9.5, TEXTE);
    yC += 13;
  }
  if (f.client_adresse) yC = paragraphe(MARGE, yC, f.client_adresse, 9.5, TEXTE, 260);

  const reste = f.total - f.montant_paye;
  const boite = { x: L - MARGE - 200, w: 200, h: 58 };
  rect(boite.x, y - 8, boite.w, boite.h, FOND);
  rect(boite.x, y - 8, 3, boite.h, OR);
  const enCours = f.montant_paye > 0 && f.statut !== "annulee" && f.statut !== "payee";
  const libelleBoite = f.statut === "payee" ? "MONTANT RÉGLÉ" : enCours ? "RESTE À PAYER" : "TOTAL À PAYER";
  const valeurBoite = enCours ? reste : f.total;
  texte(boite.x + 16, y + 10, libelleBoite, 8, GRIS, true);
  texte(boite.x + 16, y + 34, nombre(valeurBoite) + " FCFA", 17, NAVY, true);

  y = Math.max(yC, y - 8 + boite.h) + 22;

  // ---------- Tableau : N°, Désignation, Quantité, Prix unitaire, Montant ----------
  const largeurTable = L - 2 * MARGE;
  const cN = 30;
  const cQ = 62;
  const cP = 92;
  const cM = 96;
  const wDes = largeurTable - cN - cQ - cP - cM;
  const xN = MARGE;
  const xDes = xN + cN;
  const xQ = xDes + wDes;
  const xP = xQ + cQ;
  const xM = xP + cP;
  const xFin = xM + cM;

  function enteteTableau() {
    rect(MARGE, y, largeurTable, 32, NAVY);
    texte(xN + cN / 2, y + 19, "N°", 9, BLANC, true, "c");
    texte(xDes + 8, y + 19, "Désignation", 9, BLANC, true);
    texte(xQ + cQ / 2, y + 19, "Quantité", 9, BLANC, true, "c");
    texte(xP + cP - 8, y + 14, "Prix unitaire", 9, BLANC, true, "d");
    texte(xP + cP - 8, y + 25, "(FCFA)", 8, BLANC, false, "d");
    texte(xM + cM - 8, y + 14, "Montant", 9, BLANC, true, "d");
    texte(xM + cM - 8, y + 25, "(FCFA)", 8, BLANC, false, "d");
    y += 32;
  }
  enteteTableau();

  const reserveBas = 70;
  lignes.forEach((l, i) => {
    const lignesDes = couper(l.designation, 9.5, false, wDes - 16);
    const hauteur = Math.max(28, lignesDes.length * 12.5 + 15);
    if (y + hauteur > H - reserveBas) {
      nouvellePage();
      y = MARGE;
      enteteTableau();
    }
    if (i % 2 === 1) rect(MARGE, y, largeurTable, hauteur, FOND);
    texte(xN + cN / 2, y + 17, String(i + 1), 9.5, GRIS, false, "c");
    lignesDes.forEach((t, k) => texte(xDes + 8, y + 17 + k * 12.5, t, 9.5, TEXTE));
    texte(xQ + cQ / 2, y + 17, nombre(Number(l.quantite)), 9.5, TEXTE, false, "c");
    texte(xP + cP - 8, y + 17, nombre(l.prix_unitaire), 9.5, TEXTE, false, "d");
    texte(xM + cM - 8, y + 17, nombre(l.total_ligne), 9.5, NAVY, true, "d");
    filet(MARGE, y + hauteur, xFin, FILET, 0.5);
    y += hauteur;
  });

  // ---------- Totaux (à droite) et moyens de paiement (à gauche) ----------
  if (y + 150 > H - reserveBas) {
    nouvellePage();
    y = MARGE;
  }
  y += 18;
  const tx = L - MARGE - 235;
  const tw = 235;
  let yT = y;
  function ligneTotal(libelle: string, valeur: string, col: Couleur = TEXTE, gras = false, taille = 10) {
    texte(tx, yT, libelle, taille, col, gras);
    texte(tx + tw, yT, valeur, taille, col, gras, "d");
    yT += taille + 6.5;
  }
  ligneTotal("Sous-total", nombre(f.sous_total) + " FCFA");
  const remise = f.remise_montant ?? 0;
  if (remise > 0) {
    const lib = f.remise_taux ? "Remise (" + nombre(Number(f.remise_taux)) + " %)" : "Remise";
    ligneTotal(lib, "- " + nombre(remise) + " FCFA", OR_FONCE);
  }
  if (f.tva_taux > 0) ligneTotal("TVA (" + nombre(Number(f.tva_taux)) + " %)", nombre(f.tva_montant) + " FCFA");
  filet(tx, yT - 4, tx + tw, FILET, 0.8);
  yT += 6;
  texte(tx, yT + 2, "Total à payer", 11, NAVY, true);
  texte(tx + tw, yT + 2, nombre(f.total) + " FCFA", 13, NAVY, true, "d");
  rect(tx, yT + 8, 46, 2.5, OR);
  yT += 26;
  if (f.montant_paye > 0 && f.statut !== "annulee") {
    ligneTotal("Montant payé", nombre(f.montant_paye) + " FCFA", VERT);
    ligneTotal("Reste à payer", nombre(reste) + " FCFA", OR_FONCE, true, 11);
  }

  let yP = y;
  texte(MARGE, yP, "MOYENS DE PAIEMENT", 8, OR_FONCE, true);
  yP += 14;
  yP = paragraphe(MARGE, yP, MODES_PAIEMENT.join("  ·  "), 9, TEXTE, tx - MARGE - 20);
  if (e?.infos_paiement) {
    yP += 4;
    yP = paragraphe(MARGE, yP, e.infos_paiement, 9, NAVY, tx - MARGE - 20, true);
  }

  y = Math.max(yT, yP) + 14;

  if (f.statut !== "annulee") {
    texte(MARGE, y, "Arrêtée la présente facture à la somme de :", 9.5, GRIS);
    y += 14;
    y = paragraphe(MARGE, y, phraseMontant(f.total).replace(/^./, (x) => x.toUpperCase()) + ".", 10.5, NAVY, L - 2 * MARGE, true) + 4;
  }
  if (f.note) {
    y += 8;
    texte(MARGE, y, "NOTE", 8, OR_FONCE, true);
    y = paragraphe(MARGE, y + 13, f.note, 9.5, TEXTE, L - 2 * MARGE) + 4;
  }

  if (y + 70 > H - 50) {
    nouvellePage();
    y = MARGE;
  }
  y += 36;
  filet(L - MARGE - 170, y + 28, L - MARGE, TEXTE, 0.6);
  texte(L - MARGE - 85, y + 41, "Cachet et signature", 8.5, GRIS, false, "c");

  // ---------- Pied de page (sur toutes les pages) ----------
  pages.forEach((p, i) => {
    ops = p;
    filet(MARGE, H - 44, L - MARGE, FILET, 0.6);
    texte(MARGE, H - 30, "DIAKO BUSINESS  ·  La technologie au service de vos affaires.", 8, GRIS);
    texte(L - MARGE, H - 30, "Page " + (i + 1) + " / " + pages.length, 8, GRIS, false, "d");
  });

  // ---------- Assemblage du fichier PDF ----------
  const morceaux: Uint8Array[] = [];
  const offsets: number[] = [];
  let position = 0;
  const ascii = (t: string) => {
    const o = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) o[i] = t.charCodeAt(i) & 255;
    return o;
  };
  const ajouter = (o: Uint8Array) => {
    morceaux.push(o);
    position += o.length;
  };
  const objet = (numero: number, corps: string | Uint8Array[]) => {
    offsets[numero] = position;
    ajouter(ascii(numero + " 0 obj\n"));
    if (typeof corps === "string") ajouter(ascii(corps));
    else corps.forEach(ajouter);
    ajouter(ascii("\nendobj\n"));
  };

  const nbPages = pages.length;
  const numImage = logo ? 5 : 0;
  const premierePage = logo ? 6 : 5;
  const numPage = (i: number) => premierePage + i * 2;
  const numContenu = (i: number) => premierePage + i * 2 + 1;
  const nbObjets = premierePage + nbPages * 2;

  ajouter(ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
  objet(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objet(2, "<< /Type /Pages /Kids [" + pages.map((_, i) => numPage(i) + " 0 R").join(" ") + "] /Count " + nbPages + " >>");
  objet(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objet(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  if (logo) {
    const espace = logo.composantes === 1 ? "/DeviceGray" : logo.composantes === 4 ? "/DeviceCMYK" : "/DeviceRGB";
    objet(numImage, [
      ascii(
        "<< /Type /XObject /Subtype /Image /Width " + logo.w + " /Height " + logo.h + " /ColorSpace " + espace +
          " /BitsPerComponent 8 /Filter /DCTDecode /Length " + logo.octets.length + " >>\nstream\n"
      ),
      logo.octets,
      ascii("\nendstream"),
    ]);
  }
  pages.forEach((p, i) => {
    const contenu = p.join("\n");
    const ressources =
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >>" + (logo ? " /XObject << /Im1 " + numImage + " 0 R >>" : "") + " >>";
    objet(numPage(i), "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + L + " " + H + "] " + ressources + " /Contents " + numContenu(i) + " 0 R >>");
    objet(numContenu(i), "<< /Length " + contenu.length + " >>\nstream\n" + contenu + "\nendstream");
  });

  const debutXref = position;
  let xref = "xref\n0 " + nbObjets + "\n0000000000 65535 f \n";
  for (let i = 1; i < nbObjets; i++) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  xref += "trailer\n<< /Size " + nbObjets + " /Root 1 0 R >>\nstartxref\n" + debutXref + "\n%%EOF";
  ajouter(ascii(xref));

  const sortie = new Uint8Array(position);
  let decalage = 0;
  morceaux.forEach((m) => {
    sortie.set(m, decalage);
    decalage += m.length;
  });
  return sortie;
}

export function nomFichierPdf(f: Facture): string {
  return "Facture-" + f.numero.replace(/[^A-Za-z0-9-]/g, "") + ".pdf";
}

export function telechargerPdf(octets: Uint8Array, nomFichier: string) {
  const blob = new Blob([octets as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

// Partage du fichier PDF (WhatsApp, e-mail...) quand le téléphone le permet. Renvoie false sinon.
export async function partagerPdf(octets: Uint8Array, nomFichier: string, message: string): Promise<boolean> {
  try {
    const fichier = new File([octets as unknown as BlobPart], nomFichier, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (donnees: ShareData) => boolean };
    if (!nav.canShare || !nav.canShare({ files: [fichier] })) return false;
    await nav.share({ files: [fichier], text: message, title: nomFichier });
    return true;
  } catch (erreur) {
    // Si la personne ferme la fenêtre de partage, ce n'est pas une erreur.
    return (erreur as Error)?.name === "AbortError";
  }
}
