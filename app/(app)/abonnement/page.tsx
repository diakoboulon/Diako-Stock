"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";
import { infoAbonnement, InfoAbonnement } from "@/lib/plans";
import GrillePlans from "@/components/GrillePlans";

export default function AbonnementPage() {
  const router = useRouter();
  const [info, setInfo] = useState<InfoAbonnement | null>(null);
  const [commerce, setCommerce] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function init() {
      const c = await commerceActuel();
      if (!c) {
        router.push("/connexion");
        return;
      }
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      setCommerce(c.nom ?? "");
      setInfo(await infoAbonnement(c.businessId));
    }
    init();
  }, [router]);

  if (!info) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>
    );
  }

  const { plan, nbProduits, expireLe } = info;
  const pct = plan.limite ? Math.min(100, Math.round((nbProduits / plan.limite) * 100)) : 0;

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-16">
      <a href="/tableau-de-bord" className="text-sm text-ink/50">← Accueil</a>
      <h1 className="font-display text-2xl font-bold text-indigo-deep mt-3 mb-5">Mon abonnement</h1>

      <section className="card mb-6">
        <p className="text-ink/50 text-sm">Plan actuel</p>
        <p className="font-display text-2xl font-bold text-indigo-deep">{plan.nom}</p>
        {expireLe && (
          <p className="text-sm text-ink/60 mt-1">
            Actif jusqu&apos;au {new Date(expireLe).toLocaleDateString("fr-FR")}
          </p>
        )}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink/60">Produits utilisés</span>
            <span className="font-semibold">
              {nbProduits} / {plan.limite ?? "illimité"}
            </span>
          </div>
          {plan.limite && (
            <div className="h-2.5 bg-ink/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct >= 100 ? "bg-clay" : pct >= 80 ? "bg-bronze" : "bg-indigo-deep"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {plan.limite && nbProduits >= plan.limite && (
            <p className="text-sm text-clay mt-2 font-medium">
              Limite atteinte : choisissez un plan supérieur pour ajouter d&apos;autres produits.
            </p>
          )}
        </div>
      </section>

      <h2 className="font-display text-lg font-bold text-indigo-deep mb-3">Changer de plan</h2>
      <GrillePlans planActuel={plan.id} commerce={commerce} email={email} />
    </main>
  );
}
