"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { commerceActuel } from "@/lib/business";
import { infoAbonnement, planAuMoins, planParId, PlanId } from "@/lib/plans";

// Affiche la page seulement si le commerce a au moins le plan demandé
export default function PlanRequis({
  minimum,
  fonction,
  children,
}: {
  minimum: PlanId;
  fonction: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [autorise, setAutorise] = useState<boolean | null>(null);

  useEffect(() => {
    async function verifier() {
      const c = await commerceActuel();
      if (!c) {
        router.push("/connexion");
        return;
      }
      const info = await infoAbonnement(c.businessId);
      setAutorise(planAuMoins(info.plan.id, minimum));
    }
    verifier();
  }, [router, minimum]);

  if (autorise === null) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>
    );
  }
  if (autorise) return <>{children}</>;

  const plan = planParId(minimum);
  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto flex flex-col justify-center">
      <div className="card text-center py-10">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="font-display text-xl font-bold text-indigo-deep mb-2">{fonction}</h1>
        <p className="text-ink/60 mb-6">
          Cette fonction est incluse à partir du plan {plan.nom} ({plan.prixMois.toLocaleString("fr-FR")} FCFA / mois).
        </p>
        <a href="/abonnement" className="btn-primary w-full block mb-3">Voir les plans</a>
        <a href="/tableau-de-bord" className="block text-ink/50 text-sm">Retour à l&apos;accueil</a>
      </div>
    </main>
  );
}
