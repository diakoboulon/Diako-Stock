"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InscriptionPage() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    email: "",
    motDePasse: "",
    commerce: "",
    ville: "",
    adresse: "",
  });

  function majChamp(champ: string, valeur: string) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function creerCompte(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { data, error: erreurAuth } = await supabase.auth.signUp({
      email: form.email,
      password: form.motDePasse,
    });
    if (erreurAuth || !data.user) {
      setChargement(false);
      setErreur(erreurAuth?.message ?? "Impossible de créer le compte.");
      return;
    }

    // Si la confirmation par email est activée, il n'y a pas encore de session
    // pour appeler la fonction sécurisée. On connecte donc explicitement.
    if (!data.session) {
      const { error: erreurConnexion } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.motDePasse,
      });
      if (erreurConnexion) {
        setChargement(false);
        setErreur(
          "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous."
        );
        return;
      }
    }

    const { error: erreurCommerce } = await supabase.rpc(
      "creer_commerce_inscription",
      {
        p_prenom: form.prenom,
        p_nom: form.nom,
        p_telephone: form.telephone,
        p_commerce: form.commerce,
        p_ville: form.ville,
        p_adresse: form.adresse,
      }
    );

    setChargement(false);
    if (erreurCommerce) {
      setErreur(erreurCommerce.message);
      return;
    }
    router.push("/tableau-de-bord");
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-sm mx-auto">
      <h1 className="font-display text-2xl font-bold text-indigo-deep mb-1">
        Créer votre commerce
      </h1>
      <p className="text-ink/60 mb-8">Quelques informations pour démarrer.</p>

      <form onSubmit={creerCompte} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Prénom"
            className="input-field"
            value={form.prenom}
            onChange={(e) => majChamp("prenom", e.target.value)}
          />
          <input
            required
            placeholder="Nom"
            className="input-field"
            value={form.nom}
            onChange={(e) => majChamp("nom", e.target.value)}
          />
        </div>
        <input
          required
          placeholder="Téléphone"
          className="input-field"
          value={form.telephone}
          onChange={(e) => majChamp("telephone", e.target.value)}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="input-field"
          value={form.email}
          onChange={(e) => majChamp("email", e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Mot de passe"
          className="input-field"
          value={form.motDePasse}
          onChange={(e) => majChamp("motDePasse", e.target.value)}
        />

        <hr className="border-ink/10" />

        <input
          required
          placeholder="Nom du commerce"
          className="input-field"
          value={form.commerce}
          onChange={(e) => majChamp("commerce", e.target.value)}
        />
        <input
          required
          placeholder="Ville"
          className="input-field"
          value={form.ville}
          onChange={(e) => majChamp("ville", e.target.value)}
        />
        <input
          placeholder="Quartier / adresse"
          className="input-field"
          value={form.adresse}
          onChange={(e) => majChamp("adresse", e.target.value)}
        />

        {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

        <button type="submit" disabled={chargement} className="btn-primary w-full">
          {chargement ? "Création..." : "Créer mon commerce"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-bronze font-semibold">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
