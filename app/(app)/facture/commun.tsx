"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";
import { WHATSAPP_ABONNEMENT } from "@/lib/plans";
import { STATUTS_FACTURE, joursRestants } from "@/lib/facture";

export function BadgeStatut({ statut }: { statut: string }) {
  const classes: Record<string, string> = {
    emise: "bg-bronze/15 text-[#7A5A12]",
    partielle: "bg-clay/15 text-clay",
    payee: "bg-green-600/10 text-green-700",
    annulee: "bg-ink/10 text-ink/60",
  };
  return (
    <span className={`inline-block whitespace-nowrap text-xs font-semibold rounded-full px-3 py-1 ${classes[statut] ?? classes.emise}`}>
      {STATUTS_FACTURE[statut] ?? statut}
    </span>
  );
}

export type ContexteFacture = {
  businessId: string;
  nomCommerce: string;
  estProprietaire: boolean;
  moduleActif: boolean; // essai en cours ou abonnement actif
  active: boolean; // le module a déjà été activé un jour
  statut: string | null;
  essaiFin: string | null;
};

// Qui est connecté, et le module Diako Facture est-il utilisable ?
export function useContexteFacture(): ContexteFacture | null {
  const router = useRouter();
  const [ctx, setCtx] = useState<ContexteFacture | null>(null);

  useEffect(() => {
    async function init() {
      const c = await commerceActuel();
      if (!c) {
        router.push("/connexion");
        return;
      }
      const [{ data: actif }, { data: ligne }] = await Promise.all([
        supabase.rpc("module_actif", { p_business: c.businessId, p_module: "facture" }),
        supabase
          .from("business_modules")
          .select("statut, essai_fin")
          .eq("business_id", c.businessId)
          .eq("module_code", "facture")
          .maybeSingle(),
      ]);
      setCtx({
        businessId: c.businessId,
        nomCommerce: c.nom,
        estProprietaire: c.role === "owner",
        moduleActif: actif === true,
        active: !!ligne,
        statut: ligne?.statut ?? null,
        essaiFin: ligne?.essai_fin ?? null,
      });
    }
    init();
  }, [router]);

  return ctx;
}

export function EcranBloque({ titre, texte, avecWhatsApp }: { titre: string; texte: string; avecWhatsApp?: boolean }) {
  const lien = `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent(
    "Bonjour, je souhaite activer Diako Facture pour mon commerce."
  )}`;
  return (
    <main className="min-h-screen bg-bone px-5 py-10 max-w-md mx-auto">
      <div className="bg-white border border-ink/10 rounded-3xl p-6 text-center">
        <p className="text-4xl mb-3">🧾</p>
        <h1 className="font-display text-xl font-bold text-indigo-deep">{titre}</h1>
        <p className="text-ink/60 mt-2">{texte}</p>
        {avecWhatsApp && (
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block bg-bronze text-white font-display font-semibold rounded-2xl py-3.5"
          >
            Demander l&apos;activation sur WhatsApp
          </a>
        )}
        <a href="/modules" className="inline-block mt-4 text-sm font-semibold text-indigo-deep underline underline-offset-4">
          Retour à mes modules
        </a>
      </div>
    </main>
  );
}

export function BandeauEssai({ ctx }: { ctx: ContexteFacture }) {
  if (ctx.statut === "essai" && ctx.moduleActif) {
    const j = joursRestants(ctx.essaiFin);
    return (
      <p className="text-sm bg-bronze/10 text-[#7A5A12] rounded-xl px-4 py-2.5 mb-4">
        Essai gratuit : il vous reste <strong>{j} jour{j > 1 ? "s" : ""}</strong>.
      </p>
    );
  }
  if (!ctx.moduleActif) {
    return (
      <p className="text-sm bg-clay/10 text-clay rounded-xl px-4 py-2.5 mb-4">
        Votre essai est terminé : vous pouvez consulter vos factures, mais plus en créer. Écrivez-nous sur WhatsApp pour vous abonner.
      </p>
    );
  }
  return null;
}
