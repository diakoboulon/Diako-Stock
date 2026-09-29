"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";
import BottomNav from "@/components/BottomNav";

type Produit = {
  id: string;
  nom: string;
  sku: string | null;
  quantite: number;
  seuil_alerte: number;
  prix_vente: number;
  unite: string;
  category_id: string | null;
};
type Categorie = { id: string; nom: string };

export default function ProduitsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);

  async function chargerTout(bId: string) {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase
        .from("products")
        .select("id, nom, sku, quantite, seuil_alerte, prix_vente, unite, category_id")
        .eq("business_id", bId)
        .eq("actif", true)
        .order("nom"),
      supabase.from("categories").select("id, nom").eq("business_id", bId).order("nom"),
    ]);
    setProduits(p ?? []);
    setCategories(c ?? []);
    setChargement(false);
  }

  useEffect(() => {
    async function init() {
      const commerce = await commerceActuel();
      if (!commerce) {
        router.push("/connexion");
        return;
      }
      setBusinessId(commerce.businessId);
      await chargerTout(commerce.businessId);
    }
    init();
  }, [router]);

  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-28">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-indigo-deep">Mes produits</h1>
        <button
          onClick={() => setFormOuvert(true)}
          className="bg-indigo-deep text-bone text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + Ajouter
        </button>
      </header>

      <input
        className="input-field mb-5"
        placeholder="Rechercher un produit..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {chargement ? (
        <p className="text-ink/50 text-center mt-10">Chargement...</p>
      ) : produitsFiltres.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-ink/60">
            {produits.length === 0
              ? "Aucun produit pour l'instant. Ajoutez le premier."
              : "Aucun produit ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {produitsFiltres.map((p) => {
            const rupture = Number(p.quantite) === 0;
            const faible = !rupture && Number(p.quantite) <= Number(p.seuil_alerte);
            return (
              <div key={p.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">{p.nom}</p>
                  <p className="text-sm text-ink/50">
                    {p.prix_vente.toLocaleString("fr-FR")} FCFA · {p.unite}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display font-bold ${
                      rupture ? "text-clay" : faible ? "text-bronze" : "text-indigo-deep"
                    }`}
                  >
                    {p.quantite}
                  </p>
                  {rupture && <p className="text-[11px] text-clay">Rupture</p>}
                  {faible && !rupture && <p className="text-[11px] text-bronze">Stock faible</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOuvert && businessId && (
        <FormulaireProduit
          businessId={businessId}
          categories={categories}
          onFerme={() => setFormOuvert(false)}
          onCree={async () => {
            setFormOuvert(false);
            setChargement(true);
            await chargerTout(businessId);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}

function FormulaireProduit({
  businessId,
  categories,
  onFerme,
  onCree,
}: {
  businessId: string;
  categories: Categorie[];
  onFerme: () => void;
  onCree: () => void;
}) {
  const [nom, setNom] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [quantiteInitiale, setQuantiteInitiale] = useState("");
  const [seuilAlerte, setSeuilAlerte] = useState("5");
  const [unite, setUnite] = useState("pièce");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    try {
      let finalCategoryId: string | null = categoryId || null;
      if (!finalCategoryId && nouvelleCategorie.trim()) {
        const { data: cat, error: erreurCat } = await supabase
          .from("categories")
          .insert({ business_id: businessId, nom: nouvelleCategorie.trim() })
          .select("id")
          .single();
        if (erreurCat) throw erreurCat;
        finalCategoryId = cat.id;
      }

      const { data: produit, error: erreurProduit } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          nom: nom.trim(),
          category_id: finalCategoryId,
          prix_vente: Math.round(Number(prixVente)),
          seuil_alerte: Number(seuilAlerte) || 5,
          unite,
        })
        .select("id")
        .single();
      if (erreurProduit) throw erreurProduit;

      const qte = Number(quantiteInitiale);
      if (qte > 0) {
        const { error: erreurStock } = await supabase.rpc("entree_stock", {
          p_business: businessId,
          p_product: produit.id,
          p_quantite: qte,
          p_prix_achat: Math.round(Number(prixAchat) || 0),
        });
        if (erreurStock) throw erreurStock;
      }

      onCree();
    } catch (err: any) {
      setErreur(err.message ?? "Une erreur est survenue.");
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bone rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-display text-xl font-bold text-indigo-deep mb-4">
          Nouveau produit
        </h2>
        <form onSubmit={enregistrer} className="space-y-3">
          <input
            required
            placeholder="Nom du produit"
            className="input-field"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />

          <select
            className="input-field"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          {!categoryId && (
            <input
              placeholder="Ou créer une nouvelle catégorie"
              className="input-field"
              value={nouvelleCategorie}
              onChange={(e) => setNouvelleCategorie(e.target.value)}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min="0"
              placeholder="Prix de vente (FCFA)"
              className="input-field"
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
            />
            <input
              placeholder="Unité (pièce, kg...)"
              className="input-field"
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              placeholder="Quantité initiale"
              className="input-field"
              value={quantiteInitiale}
              onChange={(e) => setQuantiteInitiale(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Prix d'achat"
              className="input-field"
              value={prixAchat}
              onChange={(e) => setPrixAchat(e.target.value)}
            />
          </div>
          <p className="text-xs text-ink/50 -mt-1">
            Laisse vide si tu n&apos;as pas encore de stock à enregistrer.
          </p>

          <input
            type="number"
            min="0"
            placeholder="Seuil d'alerte (5 par défaut)"
            className="input-field"
            value={seuilAlerte}
            onChange={(e) => setSeuilAlerte(e.target.value)}
          />

          {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onFerme}
              className="flex-1 py-3 rounded-xl border border-ink/15 font-medium text-ink/70"
            >
              Annuler
            </button>
            <button type="submit" disabled={envoi} className="btn-primary flex-1">
              {envoi ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
