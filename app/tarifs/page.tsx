import Link from "next/link";
import GrillePlans from "@/components/GrillePlans";

export const metadata = {
  title: "Tarifs — Diako Stock",
  description: "Choisissez le plan Diako Stock selon le nombre de produits de votre commerce.",
};

export default function TarifsPage() {
  return (
    <main className="min-h-screen bg-bone px-5 py-10 max-w-md mx-auto">
      <Link href="/" className="text-sm text-ink/50">← Diako Stock</Link>
      <h1 className="font-display text-3xl font-bold text-indigo-deep mt-4 mb-2">
        Un prix selon la taille de votre commerce
      </h1>
      <p className="text-ink/60 mb-6">
        Commencez gratuitement. Passez au plan supérieur quand votre nombre de produits grandit.
      </p>
      <GrillePlans lienInscription />
    </main>
  );
}
