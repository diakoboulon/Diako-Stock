"use client";

import { useState } from "react";
import { PLANS, PlanId, prixFcfa, lienDemandeWhatsApp, lienPaiementDiakoboulon } from "@/lib/plans";

const ICONES: Record<PlanId, string> = { gratuit: "🌱", standard: "🚀", pro: "🏪", business: "🏢" };
const POUR: Record<PlanId, string> = {
  gratuit: "Pour essayer, sans payer",
  standard: "Pour la boutique qui grandit",
  pro: "Pour le grand commerce",
  business: "Sans aucune limite",
};

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
      <div className="flex bg-white border border-ink/10 rounded-2xl p-1 mb-6 shadow-sm">
        <button
          onClick={() => setAnnuel(false)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${!annuel ? "bg-indigo-deep text-bone" : "text-ink/50"}`}
        >
          Par mois
        </button>
        <button
          onClick={() => setAnnuel(true)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${annuel ? "bg-indigo-deep text-bone" : "text-ink/50"}`}
        >
          Par an · <span className={annuel ? "text-bone" : "text-bronze"}>2 mois offerts</span>
        </button>
      </div>

      <div className="space-y-5">
        {PLANS.map((p) => {
          const actuel = planActuel === p.id;
          const conseille = p.id === "standard";
          const prix = annuel ? p.prixMois * 10 : p.prixMois;
          const parJour = Math.round((annuel ? p.prixMois * 10 / 365 : p.prixMois / 30) / 5) * 5;
          return (
            <div
              key={p.id}
              className={`relative rounded-3xl p-5 ${
                conseille
                  ? "bg-indigo-deep text-bone shadow-xl ring-2 ring-bronze"
                  : "bg-white border border-ink/10 shadow-sm"
              } ${actuel ? "ring-2 ring-indigo-deep" : ""}`}
            >
              {conseille && !actuel && (
                <span className="absolute -top-3 left-5 bg-bronze text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                  ⭐ Le plus choisi
                </span>
              )}
              {actuel && (
                <span className="absolute -top-3 left-5 bg-indigo-deep text-bone text-[11px] font-semibold px-3 py-1 rounded-full">
                  Votre plan
                </span>
              )}

              <div className="flex items-center gap-3 mb-3">
                <span className={`text-2xl w-11 h-11 flex items-center justify-center rounded-2xl ${conseille ? "bg-white/15" : "bg-bone"}`}>
                  {ICONES[p.id]}
                </span>
                <div>
                  <h3 className={`font-display text-xl font-bold ${conseille ? "text-bone" : "text-indigo-deep"}`}>{p.nom}</h3>
                  <p className={`text-xs ${conseille ? "text-bone/70" : "text-ink/50"}`}>{POUR[p.id]}</p>
                </div>
              </div>

              <p className="mb-3">
                <span className="font-display text-3xl font-bold">{p.prixMois === 0 ? "0" : prixFcfa(prix).replace(" FCFA", "")}</span>
                <span className={`text-sm ml-1 ${conseille ? "text-bone/70" : "text-ink/50"}`}>
                  FCFA{p.prixMois === 0 ? "" : annuel ? " / an" : " / mois"}
                </span>
              </p>
              {p.prixMois > 0 && (
                <p className={`text-xs -mt-2 mb-3 font-medium ${conseille ? "text-bone/80" : "text-bronze"}`}>
                  Soit environ {parJour} FCFA par jour
                </p>
              )}

              <ul className="space-y-1.5 mb-4">
                {p.inclus.map((l) => (
                  <li key={l} className={`text-sm flex gap-2 ${conseille ? "text-bone/90" : "text-ink/75"}`}>
                    <span className="text-bronze font-bold">✓</span> {l}
                  </li>
                ))}
                {p.bientot?.map((l) => (
                  <li key={l} className={`text-sm ${conseille ? "text-bone/50" : "text-ink/40"}`}>◷ {l} (bientôt)</li>
                ))}
              </ul>

              {p.id !== "gratuit" && !actuel && !lienInscription && (
                <>
                  {email ? (
                    <a
                      href={lienPaiementDiakoboulon(p, email, annuel)}
                      className={`w-full block text-center font-display font-semibold rounded-xl px-5 py-3 ${conseille ? "bg-bronze text-white" : "btn-primary"}`}
                    >
                      Payer le plan {p.nom}
                    </a>
                  ) : null}
                  <a
                    href={lienDemandeWhatsApp(p, commerce, email, annuel)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={email ? `block text-center text-sm mt-2 underline ${conseille ? "text-bone/70" : "text-ink/50"}` : `w-full block text-center font-display font-semibold rounded-xl px-5 py-3 ${conseille ? "bg-bronze text-white" : "btn-primary"}`}
                  >
                    {email ? "Ou demander par WhatsApp" : `Choisir ${p.nom}`}
                  </a>
                </>
              )}
              {lienInscription && (
                <a
                  href="/inscription"
                  className={`w-full block text-center font-display font-semibold rounded-xl px-5 py-3 ${conseille ? "bg-bronze text-white" : "btn-primary"}`}
                >
                  {p.id === "gratuit" ? "Commencer gratuitement" : `Commencer, puis passer au ${p.nom}`}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-ink/10 p-4 flex gap-3 items-start">
        <span className="text-2xl">🟠</span>
        <p className="text-sm text-ink/70">
          <b className="text-ink">Payez avec Orange Money.</b> Paiement sécurisé sur Diakoboulon. Votre plan est activé automatiquement dès que le paiement est confirmé.
        </p>
      </div>
    </div>
  );
}
