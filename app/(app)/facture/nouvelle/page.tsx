"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { EcranBloque, useContexteFacture } from "../commun";
import FormulaireFacture, { valeursVides } from "../formulaire";

export default function NouvelleFacture() {
  const router = useRouter();
  const ctx = useContexteFacture();
  const identifiantUnique = useRef<string | null>(null);
  const valeurs = useRef(valeursVides());

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut créer des factures." />;
  }
  if (!ctx.moduleActif) {
    return (
      <EcranBloque
        titre="Création impossible"
        texte="Votre essai de Diako Facture est terminé. Écrivez-nous sur WhatsApp pour vous abonner."
        avecWhatsApp
      />
    );
  }

  return (
    <FormulaireFacture
      ctx={ctx}
      initial={valeurs.current}
      titre="Nouvelle facture"
      libelleBouton="Créer la facture"
      libelleEnCours="Création en cours..."
      lienRetour={["/facture", "← Mes factures"]}
      enregistrer={async (p) => {
        if (!identifiantUnique.current) identifiantUnique.current = crypto.randomUUID();
        const { data, error } = await supabase.rpc("creer_facture_v2", {
          p_business: ctx.businessId,
          ...p,
          p_client_uuid: identifiantUnique.current,
        });
        if (error) return enFrancais(error.message, "Impossible de créer la facture. Veuillez réessayer.");
        router.push(`/facture/${data}`);
        return null;
      }}
    />
  );
}
