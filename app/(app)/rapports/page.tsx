"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";

function BottomNav() {
  const items = [
    { href: "/tableau-de-bord", label: "Accueil", icone: "🏠" },
    { href: "/produits", label: "Produits", icone: "📦" },
    { href: "/ventes/nouvelle", label: "Vente", icone: "🛒" },
    { href: "/rapports", label: "Rapports", icone: "📊" },
    { href: "/clients", label: "Clients", icone: "👥" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink/40"
          >
            <span className="text-lg leading-none">{item.icone}</span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

type Periode = "jour" | "semaine" | "mois" | "personnalisee";

function debutPeriode(periode: Periode, debutPerso: string): Date {
  const d = new Date();
  if (periode === "personnalisee" && debutPerso) return new Date(debutPerso);
  d.setHours(0, 0, 0, 0);
  if (periode === "semaine") d.setDate(d.getDate() - d.getDay());
  if (periode === "mois") d.setDate(1);
  return d;
}

export default function RapportsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [estProprietaire, setEstProprietaire] = useState(false);
  const [periode, setPeriode] = useState<Periode>("jour");
  const [debutPerso, setDebutPerso] = useState("");
  const [finPerso, setFinPerso] = useState("");
  const [chargement, setChargement] = useState(true);

  const [totalVentes, setTotalVentes] = useState(0);
  const [nbVentes, setNbVentes] = useState(0);
  const [benefice, setBenefice] = useState<number | null>(null);
  const [topProduits, setTopProduits] = useState<
    { nom: string; quantite: number; total: number }[]
  >([]);
  const [valeurStockVente, setValeurStockVente] = useState(0);
  const [valeurStockAchat, setValeurStockAchat] = useState<number | null>(null);

  const debut = useMemo(() => debutPeriode(periode, debutPerso), [periode, debutPerso]);
  const fin = useMemo(() => {
    if (periode === "personnalisee" && finPerso) {
      const d = new Date(finPerso);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return new Date();
  }, [periode, finPerso]);

  useEffect(() => {
    async function init() {
      const commerce = await commerceActuel();
      if (!commerce) {
        router.push("/connexion");
        return;
      }
      setBusinessId(commerce.businessId);
      setEstProprietaire(commerce.role === "owner");
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!businessId) return;
    let annule = false;

    async function charger() {
      setChargement(true);

      const { data: ventes } = await supabase
        .from("sales")
        .select("id, total")
        .eq("business_id", businessId!)
        .gte("created_at", debut.toISOString())
        .lte("created_at", fin.toISOString());

      const idsVentes = (ventes ?? []).map((v) => v.id);
      const totalV = (ventes ?? []).reduce((s, v) => s + (v.total ?? 0), 0);

      let lignes: { id: string; product_id: string | null; nom_produit: string; quantite: number; total_ligne: number }[] = [];
      if (idsVentes.length > 0) {
        const { data: li } = await supabase
          .from("sale_items")
          .select("id, product_id, nom_produit, quantite, total_ligne")
          .in("sale_id", idsVentes);
        lignes = li ?? [];
      }

      const parProduit: Record<string, { nom: string; quantite: number; total: number }> = {};
      lignes.forEach((l) => {
        const cle = l.product_id ?? l.nom_produit;
        if (!parProduit[cle]) parProduit[cle] = { nom: l.nom_produit, quantite: 0, total: 0 };
        parProduit[cle].quantite += Number(l.quantite);
        parProduit[cle].total += l.total_ligne;
      });
      const top = Object.values(parProduit)
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, 5);

      let beneficeCalcule: number | null = null;
      if (estProprietaire && lignes.length > 0) {
        const idsLignes = lignes.map((l) => l.id);
        const { data: couts } = await supabase
          .from("sale_item_costs")
          .select("sale_item_id, cout_unitaire")
          .in("sale_item_id", idsLignes);
        const coutParLigne: Record<string, number> = {};
        (couts ?? []).forEach((c) => (coutParLigne[c.sale_item_id] = c.cout_unitaire));
        const coutTotal = lignes.reduce(
          (s, l) => s + (coutParLigne[l.id] ?? 0) * Number(l.quantite),
          0
        );
        beneficeCalcule = totalV - coutTotal;
      } else if (estProprietaire) {
        beneficeCalcule = 0;
      }

      const { data: produits } = await supabase
        .from("products")
        .select("id, quantite, prix_vente")
        .eq("business_id", businessId!)
        .eq("actif", true);
      const valStockVente = (produits ?? []).reduce(
        (s, p) => s + Number(p.quantite) * p.prix_vente,
        0
      );

      let valStockAchat: number | null = null;
      if (estProprietaire && produits && produits.length > 0) {
        const { data: couts } = await supabase
          .from("product_costs")
          .select("product_id, prix_achat")
          .eq("business_id", businessId!);
        const coutParProduit: Record<string, number> = {};
        (couts ?? []).forEach((c) => (coutParProduit[c.product_id] = c.prix_achat));
        valStockAchat = produits.reduce(
          (s, p) => s + Number(p.quantite) * (coutParProduit[p.id] ?? 0),
          0
        );
      }

      if (annule) return;
      setTotalVentes(totalV);
      setNbVentes(idsVentes.length);
      setBenefice(beneficeCalcule);
      setTopProduits(top);
      setValeurStockVente(valStockVente);
      setValeurStockAchat(valStockAchat);
      setChargement(false);
    }
    charger();
    return () => {
      annule = true;
    };
  }, [businessId, estProprietaire, debut, fin]);

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-28">
      <h1 className="font-display text-2xl font-bold text-indigo-deep mb-5">Rapports</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {(
          [
            ["jour", "Aujourd'hui"],
            ["semaine", "Cette semaine"],
            ["mois", "Ce mois"],
            ["personnalisee", "Personnalisée"],
          ] as [Periode, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriode(val)}
            className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              periode === val ? "bg-indigo-deep text-bone" : "bg-white text-ink/60 border border-ink/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {periode === "personnalisee" && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input
            type="date"
            className="input-field"
            value={debutPerso}
            onChange={(e) => setDebutPerso(e.target.value)}
          />
          <input
            type="date"
            className="input-field"
            value={finPerso}
            onChange={(e) => setFinPerso(e.target.value)}
          />
        </div>
      )}

      {chargement ? (
        <p className="text-ink/50 text-center mt-10">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card col-span-2 bg-indigo-deep text-bone">
              <p className="text-bone/70 text-sm">Ventes sur la période</p>
              <p className="font-display text-3xl font-bold mt-1">
                {totalVentes.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-bone/60 text-xs mt-1">{nbVentes} vente(s)</p>
            </div>

            {estProprietaire && benefice !== null && (
              <div className="card col-span-2">
                <p className="text-ink/50 text-sm">Bénéfice estimé</p>
                <p className="font-display text-2xl font-bold mt-1 text-bronze">
                  {benefice.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            )}

            <div className="card">
              <p className="text-ink/50 text-sm">Valeur du stock</p>
              <p className="font-display text-lg font-bold mt-1 text-indigo-deep">
                {valeurStockVente.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-[11px] text-ink/40">au prix de vente</p>
            </div>

            {estProprietaire && valeurStockAchat !== null && (
              <div className="card">
                <p className="text-ink/50 text-sm">Valeur d&apos;achat</p>
                <p className="font-display text-lg font-bold mt-1 text-indigo-deep">
                  {valeurStockAchat.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="text-[11px] text-ink/40">au prix d&apos;achat</p>
              </div>
            )}
          </div>

          <div className="card">
            <p className="font-display font-semibold text-indigo-deep mb-3">
              Produits les plus vendus
            </p>
            {topProduits.length === 0 ? (
              <p className="text-ink/50 text-sm">Aucune vente sur cette période.</p>
            ) : (
              <div className="space-y-3">
                {topProduits.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.nom}</p>
                      <p className="text-xs text-ink/50">{p.quantite} vendu(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-indigo-deep">
                      {p.total.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </main>
  );
}
