import { supabase } from "@/lib/supabase";

// Numéro WhatsApp qui reçoit les demandes d'abonnement
export const WHATSAPP_ABONNEMENT = "22396990770";

export type PlanId = "gratuit" | "standard" | "pro" | "business";

export type Plan = {
  id: PlanId;
  nom: string;
  limite: number | null; // null = illimité
  prixMois: number;
  inclus: string[];
  bientot?: string[];
};

export const PLANS: Plan[] = [
  {
    id: "gratuit",
    nom: "Gratuit",
    limite: 10,
    prixMois: 0,
    inclus: ["Jusqu'à 10 produits", "Ventes et stock automatique", "Reçus partagés sur WhatsApp"],
  },
  {
    id: "standard",
    nom: "Standard",
    limite: 100,
    prixMois: 5000,
    inclus: ["Jusqu'à 100 produits", "Tout le plan Gratuit", "Fichier clients", "Rapports et bénéfices"],
  },
  {
    id: "pro",
    nom: "Pro",
    limite: 500,
    prixMois: 7500,
    inclus: ["Jusqu'à 500 produits", "Tout le plan Standard", "Assistance WhatsApp prioritaire"],
    bientot: ["Comptes employés"],
  },
  {
    id: "business",
    nom: "Business",
    limite: null,
    prixMois: 15000,
    inclus: ["Produits illimités", "Tout le plan Pro", "Assistance WhatsApp prioritaire"],
    bientot: ["Plusieurs boutiques"],
  },
];

const ORDRE: PlanId[] = ["gratuit", "standard", "pro", "business"];

export function planParId(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planAuMoins(actuel: PlanId, minimum: PlanId): boolean {
  return ORDRE.indexOf(actuel) >= ORDRE.indexOf(minimum);
}

export function prixFcfa(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
}

export type InfoAbonnement = {
  plan: Plan;
  expireLe: string | null;
  nbProduits: number;
};

// Plan en vigueur du commerce + nombre de produits actifs
export async function infoAbonnement(businessId: string): Promise<InfoAbonnement> {
  const [{ data: ab }, { count }] = await Promise.all([
    supabase.from("abonnements").select("plan, expire_le").eq("business_id", businessId).maybeSingle(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("actif", true),
  ]);
  const actif = ab && (!ab.expire_le || new Date(ab.expire_le) > new Date());
  return {
    plan: planParId(actif ? ab!.plan : "gratuit"),
    expireLe: actif ? ab!.expire_le : null,
    nbProduits: count ?? 0,
  };
}

export function lienDemandeWhatsApp(plan: Plan, commerce: string, email: string, annuel: boolean): string {
  const prix = annuel ? plan.prixMois * 10 : plan.prixMois;
  const duree = annuel ? "1 an (2 mois offerts)" : "1 mois";
  const texte =
    `Bonjour, je souhaite le plan ${plan.nom} de Diako Stock (${prixFcfa(prix)} pour ${duree}).\n` +
    `Commerce : ${commerce || "-"}\nEmail du compte : ${email || "-"}`;
  return `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent(texte)}`;
}

// Adresse de Diakoboulon, où se paient les abonnements Diako Stock
export const DIAKOBOULON_URL = "https://www.diakoboulon.com";

// Lien de paiement sur Diakoboulon (le plan est activé automatiquement après paiement)
export function lienPaiementDiakoboulon(plan: Plan, email: string, annuel: boolean): string {
  const q = new URLSearchParams({ plan: plan.id, email });
  if (annuel) q.set("annuel", "1");
  return `${DIAKOBOULON_URL}/abonnement-stock?${q.toString()}`;
}
