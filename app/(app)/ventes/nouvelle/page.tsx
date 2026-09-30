"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";

type Produit = {
  id: string;
  nom: string;
  prix_vente: number;
  quantite: number;
  unite: string;
};
type Client = { id: string; nom: string };
type LigneVente = { produit: Produit; quantite: number };

export default function NouvelleVentePage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recherche, setRecherche] = useState("");
  const [panier, setPanier] = useState<LigneVente[]>([]);
  const [clientId, setClientId] = useState("");
  const [aCredit, setACredit] = useState(false);
  const [montantPaye, setMontantPaye] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [venteReussie, setVenteReussie] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function init() {
      const commerce = await commerceActuel();
      if (!commerce) {
        router.push("/connexion");
        return;
      }
      setBusinessId(commerce.businessId);
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase
          .from("products")
          .select("id, nom, prix_vente, quantite, unite")
          .eq("business_id", commerce.businessId)
          .eq("actif", true)
          .gt("quantite", 0)
          .order("nom"),
        supabase
          .from("customers")
          .select("id, nom")
          .eq("business_id", commerce.businessId)
          .eq("actif", true)
          .order("nom"),
      ]);
      setProduits(p ?? []);
      setClients(c ?? []);
      setChargement(false);
    }
    init();
  }, [router]);

  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  );
  const total = panier.reduce((s, l) => s + l.produit.prix_vente * l.quantite, 0);

  function ajouterAuPanier(p: Produit) {
    setPanier((panierActuel) => {
      const existe = panierActuel.find((l) => l.produit.id === p.id);
      if (existe) {
        if (existe.quantite >= p.quantite) return panierActuel;
        return panierActuel.map((l) =>
          l.produit.id === p.id ? { ...l, quantite: l.quantite + 1 } : l
        );
      }
      return [...panierActuel, { produit: p, quantite: 1 }];
    });
  }

  function changerQuantite(produitId: string, delta: number) {
    setPanier((panierActuel) =>
      panierActuel
        .map((l) => {
          if (l.produit.id !== produitId) return l;
          const nouvelle = l.quantite + delta;
          if (nouvelle > l.produit.quantite) return l;
          return { ...l, quantite: nouvelle };
        })
        .filter((l) => l.quantite > 0)
    );
  }

  async function validerVente() {
    if (!businessId || panier.length === 0) return;
    setErreur(null);
    setEnvoi(true);

    const items = panier.map((l) => ({
      product_id: l.produit.id,
      quantite: l.quantite,
    }));
    const paye = aCredit ? Math.round(Number(montantPaye) || 0) : total;

    if (aCredit && !clientId) {
      setErreur("Une vente à crédit nécessite de choisir un client.");
      setEnvoi(false);
      return;
    }
    if (aCredit && (paye < 0 || paye > total)) {
      setErreur("Le montant payé n'est pas valide.");
      setEnvoi(false);
      return;
    }

    const clientUuid = crypto.randomUUID();
    const { error } = await supabase.rpc("creer_vente", {
      p_business: businessId,
      p_customer: clientId || null,
      p_items: items,
      p_montant_paye: paye,
      p_client_uuid: clientUuid,
    });

    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setVenteReussie(total);
  }

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">
        Chargement...
      </main>
    );
  }

  if (venteReussie !== null) {
    return (
      <main className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h1 className="font-display text-2xl font-bold text-indigo-deep mb-2">
          Vente enregistrée
        </h1>
        <p className="text-ink/60 mb-8">
          Total : {venteReussie.toLocaleString("fr-FR")} FCFA
        </p>
        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={() => {
              setPanier([]);
              setClientId("");
              setACredit(false);
              setMontantPaye("");
              setVenteReussie(null);
              router.refresh();
            }}
            className="btn-primary w-full"
          >
            Nouvelle vente
          </button>
          <a
            href="/tableau-de-bord"
            className="block w-full text-center py-3 text-ink/60 font-medium"
          >
            Retour au tableau de bord
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-6 max-w-md mx-auto pb-40">
      <h1 className="font-display text-2xl font-bold text-indigo-deep mb-4">
        Nouvelle vente
      </h1>

      <input
        className="input-field mb-3"
        placeholder="Rechercher un produit..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
        {produitsFiltres.length === 0 ? (
          <p className="text-ink/50 text-sm text-center py-4">
            Aucun produit disponible en stock.
          </p>
        ) : (
          produitsFiltres.map((p) => (
            <button
              key={p.id}
              onClick={() => ajouterAuPanier(p)}
              className="card w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="font-medium text-ink">{p.nom}</p>
                <p className="text-xs text-ink/50">
                  {p.prix_vente.toLocaleString("fr-FR")} FCFA · {p.quantite} {p.unite} dispo
                </p>
              </div>
              <span className="text-indigo-deep font-bold text-xl">+</span>
            </button>
          ))
        )}
      </div>

      {panier.length > 0 && (
        <div className="card mb-4">
          <p className="font-display font-semibold text-indigo-deep mb-3">Panier</p>
          <div className="space-y-3">
            {panier.map((l) => (
              <div key={l.produit.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{l.produit.nom}</p>
                  <p className="text-xs text-ink/50">
                    {(l.produit.prix_vente * l.quantite).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changerQuantite(l.produit.id, -1)}
                    className="w-7 h-7 rounded-full bg-bone border border-ink/15 font-bold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-medium">{l.quantite}</span>
                  <button
                    onClick={() => changerQuantite(l.produit.id, 1)}
                    className="w-7 h-7 rounded-full bg-bone border border-ink/15 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4">
        <label className="block text-sm font-medium mb-1">Client (optionnel)</label>
        <select
          className="input-field mb-3"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Sans client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aCredit}
            onChange={(e) => setACredit(e.target.checked)}
          />
          Vente à crédit (paiement partiel)
        </label>

        {aCredit && (
          <input
            type="number"
            min="0"
            max={total}
            placeholder="Montant payé maintenant (FCFA)"
            className="input-field mt-3"
            value={montantPaye}
            onChange={(e) => setMontantPaye(e.target.value)}
          />
        )}
      </div>

      {erreur && <p className="text-clay text-sm font-medium mb-3">{erreur}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ink/60">Total</p>
            <p className="font-display text-xl font-bold text-indigo-deep">
              {total.toLocaleString("fr-FR")} FCFA
            </p>
          </div>
          <button
            onClick={validerVente}
            disabled={panier.length === 0 || envoi}
            className="btn-primary w-full"
          >
            {envoi ? "Enregistrement..." : "Valider la vente"}
          </button>
        </div>
      </div>
    </main>
  );
}
