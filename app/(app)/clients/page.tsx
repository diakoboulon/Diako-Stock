"use client";

import { useEffect, useState } from "react";
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

type Client = {
  id: string;
  nom: string;
  telephone: string | null;
  whatsapp: string | null;
  adresse: string | null;
};

export default function ClientsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [estProprietaire, setEstProprietaire] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [totaux, setTotaux] = useState<Record<string, number>>({});
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);

  async function chargerTout(bId: string, proprietaire: boolean) {
    const { data: c } = await supabase
      .from("customers")
      .select("id, nom, telephone, whatsapp, adresse")
      .eq("business_id", bId)
      .eq("actif", true)
      .order("nom");
    setClients(c ?? []);

    if (proprietaire) {
      const { data: ventes } = await supabase
        .from("sales")
        .select("customer_id, total")
        .eq("business_id", bId)
        .not("customer_id", "is", null);
      const totauxCalcules: Record<string, number> = {};
      (ventes ?? []).forEach((v) => {
        if (!v.customer_id) return;
        totauxCalcules[v.customer_id] = (totauxCalcules[v.customer_id] ?? 0) + (v.total ?? 0);
      });
      setTotaux(totauxCalcules);
    }
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
      setEstProprietaire(commerce.role === "owner");
      await chargerTout(commerce.businessId, commerce.role === "owner");
    }
    init();
  }, [router]);

  const clientsFiltres = clients.filter((c) =>
    c.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-28">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-indigo-deep">Mes clients</h1>
        <button
          onClick={() => setFormOuvert(true)}
          className="bg-indigo-deep text-bone text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + Ajouter
        </button>
      </header>

      <input
        className="input-field mb-5"
        placeholder="Rechercher un client..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {chargement ? (
        <p className="text-ink/50 text-center mt-10">Chargement...</p>
      ) : clientsFiltres.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-ink/60">
            {clients.length === 0
              ? "Aucun client pour l'instant."
              : "Aucun client ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientsFiltres.map((c) => (
            <div key={c.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{c.nom}</p>
                <p className="text-sm text-ink/50">{c.telephone || "Pas de téléphone"}</p>
              </div>
              {estProprietaire && (
                <p className="font-display font-bold text-indigo-deep">
                  {(totaux[c.id] ?? 0).toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {formOuvert && businessId && (
        <FormulaireClient
          businessId={businessId}
          onFerme={() => setFormOuvert(false)}
          onCree={async () => {
            setFormOuvert(false);
            setChargement(true);
            await chargerTout(businessId, estProprietaire);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}

function FormulaireClient({
  businessId,
  onFerme,
  onCree,
}: {
  businessId: string;
  onFerme: () => void;
  onCree: () => void;
}) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [adresse, setAdresse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { error } = await supabase.from("customers").insert({
      business_id: businessId,
      nom: nom.trim(),
      telephone: telephone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      adresse: adresse.trim() || null,
    });

    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    onCree();
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bone rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-display text-xl font-bold text-indigo-deep mb-4">
          Nouveau client
        </h2>
        <form onSubmit={enregistrer} className="space-y-3">
          <input
            required
            placeholder="Nom"
            className="input-field"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <input
            placeholder="Téléphone"
            className="input-field"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
          <input
            placeholder="WhatsApp (si différent)"
            className="input-field"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <input
            placeholder="Adresse"
            className="input-field"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
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
