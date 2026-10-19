"use client";

import { useState } from "react";
import { PLANS, PlanId, prixFcfa, lienDemandeWhatsApp, lienPaiementDiakoboulon } from "@/lib/plans";

export default function GrillePlans({
  planActuel,
  commerce = "",
  email = "",
  lienInscription = false,
}: {
  planActuel?: PlanId;
  commerce?: string;
  email?: string;
  lienInscription?: boolean;
}) {
  const [annuel, setAnnuel] = useState(false);

  return (
    <div>
      <div className="flex bg-white border border-ink/10 rounded-xl p-1 mb-4">
        <button
          onClick={() => setAnnuel(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${!annuel ? "bg-indigo-deep text-bone" : "text-ink/50"}`}
        >
          Par mois
        </button>
        <button
          onClick={() => setAnnuel(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${annuel ? "bg-indigo-deep text-bone" : "text-ink/50"}`}
        >
          Par an · 2 mois offerts
        </button>
      </div>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const actuel = planActuel === p.id;
          const conseille = p.id === "standard";
          const prix = annuel ? p.prixMois * 10 : p.prixMois;
          return (
            <div
              key={p.id}
              className={`card relative ${conseille ? "border-2 border-bronze" : ""} ${actuel ? "ring-2 ring-indigo-deep" : ""}`}
            >
              {conseille && !actuel && (
                <span className="absolute -top-3 left-5 bg-bronze text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                  Le plus choisi
                </span>
              )}
              {actuel && (
                <span className="absolute -top-3 left-5 bg-indigo-deep text-bone text-[11px] font-semibold px-3 py-1 rounded-full">
                  Votre plan
                </span>
              )}
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-display text-xl font-bold text-indigo-deep">{p.nom}</h3>
                <p className="font-display font-bold text-ink">
                  {p.prixMois === 0 ? "0 FCFA" : prixFcfa(prix)}
                  <span className="text-xs font-medium text-ink/50">
                    {p.prixMois === 0 ? "" : annuel ? " / an" : " / mois"}
                  </span>
                </p>
              </div>
              <ul className="space-y-1 mb-3">
                {p.inclus.map((l) => (
                  <li key={l} className="text-sm text-ink/70">✓ {l}</li>
                ))}
                {p.bientot?.map((l) => (
                  <li key={l} className="text-sm text-ink/40">◷ {l} (bientôt)</li>
                ))}
              </ul>
              {p.id !== "gratuit" && !actuel && !lienInscription && (
                <>
                  {email ? (
                    <a
                      href={lienPaiementDiakoboulon(p, email, annuel)}
                      className="btn-primary w-full block text-center"
                    >
                      Payer le plan {p.nom}
                    </a>
                  ) : null}
                  <a
                    href={lienDemandeWhatsApp(p, commerce, email, annuel)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={email ? "block text-center text-sm text-ink/50 mt-2 underline" : "btn-primary w-full block text-center"}
                  >
                    {email ? "Ou demander par WhatsApp" : `Choisir ${p.nom}`}
                  </a>
                </>
              )}
              {lienInscription && (
                <a href="/inscription" className="btn-primary w-full block text-center">
                  {p.id === "gratuit" ? "Commencer gratuitement" : `Commencer, puis passer au ${p.nom}`}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink/50 text-center mt-4">
        Paiement sécurisé sur Diakoboulon (Orange Money ou carte). Votre plan est activé automatiquement dès que le paiement est confirmé.
      </p>
    </div>
  );
}
