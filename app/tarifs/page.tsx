import Link from "next/link";
import GrillePlans from "@/components/GrillePlans";

export const metadata = {
  title: "Tarifs — Diako Stock",
  description: "Choisissez le plan Diako Stock selon le nombre de produits de votre commerce.",
};

const QUESTIONS = [
  ["Puis-je rester gratuit ?", "Oui. Le plan Gratuit est sans limite de durée, jusqu'à 10 produits."],
  ["Comment je paie ?", "Par Orange Money, sur Diakoboulon. Votre plan s'active tout seul après le paiement."],
  ["Puis-je changer de plan ?", "Oui, à tout moment. Vous passez au plan supérieur quand votre commerce grandit."],
  ["Et si je ne renouvelle pas ?", "Vos données restent là. Vous repassez simplement au plan Gratuit."],
];

export default function TarifsPage() {
  return (
    <main className="min-h-screen bg-bone px-5 py-10 max-w-md mx-auto">
      <Link href="/" className="text-sm text-ink/50">← Diako Stock</Link>
      <h1 className="font-display text-3xl font-bold text-indigo-deep mt-4 mb-2 leading-tight">
        Sachez toujours ce qu'il reste en stock
      </h1>
      <p className="text-ink/60 mb-6">
        Commencez gratuitement. Passez au plan supérieur quand votre commerce grandit, pour moins de 170 FCFA par jour.
      </p>
      <GrillePlans lienInscription />

      <h2 className="font-display text-xl font-bold text-indigo-deep mt-10 mb-3">Questions fréquentes</h2>
      <div className="space-y-2">
        {QUESTIONS.map(([q, r]) => (
          <details key={q} className="bg-white rounded-2xl border border-ink/10 p-4">
            <summary className="font-semibold text-ink cursor-pointer">{q}</summary>
            <p className="text-sm text-ink/65 mt-2">{r}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
