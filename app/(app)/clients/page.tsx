"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { commerceActuel } from "@/lib/business";
import PlanRequis from "@/components/PlanRequis";

const fcfa = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");

function BottomNav() {
  const actif = "/clients";
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
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${item.href === actif ? "font-bold text-indigo-deep" : "font-medium text-ink/40"}`}
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

type VenteCredit = {
  id: string;
  numero: number;
  total: number;
  montant_paye: number;
};

type Compte = {
  achats: number; // total de tout ce que le client a acheté
  du: number; // ce qu'il reste à payer
  ventes: VenteCredit[]; // ventes pas encore payées, les plus anciennes d'abord
};

function lienWhatsApp(c: Client, du: number, commerce: string) {
  const brut = (c.whatsapp || c.telephone || "").replace(/[^\d+]/g, "");
  if (!brut) return null;
  let numero = brut.startsWith("+") ? brut.slice(1) : brut.startsWith("00") ? brut.slice(2) : brut;
  if (numero.length === 8) numero = "223" + numero; // numéro malien sans indicatif
  const message = `Bonjour ${c.nom}, petit rappel : il vous reste ${fcfa(du)} FCFA à régler chez ${commerce}. Merci beaucoup !`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

export default function ClientsPageProtegee() {
  return (
    <PlanRequis minimum="standard" fonction="Fichier clients">
      <ClientsPage />
    </PlanRequis>
  );
}

function ClientsPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [nomCommerce, setNomCommerce] = useState("notre commerce");
  const [estProprietaire, setEstProprietaire] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [comptes, setComptes] = useState<Record<string, Compte>>({});
  const [recherche, setRecherche] = useState("");
  const [seulementDettes, setSeulementDettes] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [clientEncaisse, setClientEncaisse] = useState<Client | null>(null);

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
        .select("id, customer_id, numero, total, montant_paye, created_at")
        .eq("business_id", bId)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: true });

      const calcules: Record<string, Compte> = {};
      (ventes ?? []).forEach((v: any) => {
        if (!v.customer_id) return;
        const compte = (calcules[v.customer_id] ??= { achats: 0, du: 0, ventes: [] });
        const total = v.total ?? 0;
        const paye = v.montant_paye ?? 0;
        compte.achats += total;
        if (total - paye > 0) {
          compte.du += total - paye;
          compte.ventes.push({ id: v.id, numero: v.numero, total, montant_paye: paye });
        }
      });
      setComptes(calcules);
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
      if (commerce.nom) setNomCommerce(commerce.nom);
      setEstProprietaire(commerce.role === "owner");
      await chargerTout(commerce.businessId, commerce.role === "owner");
    }
    init();
  }, [router]);

  const duDe = (id: string) => comptes[id]?.du ?? 0;

  const clientsFiltres = clients
    .filter((c) => c.nom.toLowerCase().includes(recherche.toLowerCase()))
    .filter((c) => !seulementDettes || duDe(c.id) > 0);

  const clientsEndettes = clients.filter((c) => duDe(c.id) > 0);
  const totalDu = clientsEndettes.reduce((somme, c) => somme + duDe(c.id), 0);

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-28">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-indigo-deep">Mes clients</h1>
          <p className="text-sm text-ink/50">{clients.length} client{clients.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setFormOuvert(true)}
          className="bg-bronze text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-md"
        >
          + Ajouter
        </button>
      </header>

      {estProprietaire && totalDu > 0 && (
        <div className="bg-white border border-clay/30 rounded-2xl p-4 mb-5">
          <p className="text-sm text-ink/60">À récupérer auprès de vos clients</p>
          <p className="font-display text-2xl font-bold text-clay">{fcfa(totalDu)} FCFA</p>
          <p className="text-sm text-ink/50">
            {clientsEndettes.length} client{clientsEndettes.length > 1 ? "s" : ""} à crédit
          </p>
        </div>
      )}

      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">🔍</span>
        <input
          className="input-field pl-11"
          placeholder="Rechercher un client..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {estProprietaire && clientsEndettes.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setSeulementDettes(false)}
            className={`py-2 rounded-xl text-sm font-medium border ${!seulementDettes ? "bg-indigo-deep text-bone border-indigo-deep" : "bg-white text-ink/60 border-ink/15"}`}
          >
            Tous
          </button>
          <button
            onClick={() => setSeulementDettes(true)}
            className={`py-2 rounded-xl text-sm font-medium border ${seulementDettes ? "bg-indigo-deep text-bone border-indigo-deep" : "bg-white text-ink/60 border-ink/15"}`}
          >
            Qui me doivent
          </button>
        </div>
      )}

      {chargement ? (
        <p className="text-ink/50 text-center mt-10">Chargement...</p>
      ) : clientsFiltres.length === 0 ? (
        <div className="bg-white border border-ink/10 rounded-3xl text-center py-10 px-6">
          <p className="text-4xl mb-2">👥</p>
          <p className="text-ink/60">
            {clients.length === 0
              ? "Aucun client pour l'instant."
              : seulementDettes
                ? "Aucun client ne vous doit d'argent."
                : "Aucun client ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientsFiltres.map((c) => {
            const du = duDe(c.id);
            const lien = du > 0 ? lienWhatsApp(c, du, nomCommerce) : null;
            return (
              <div key={c.id} className="bg-white border border-ink/10 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <span className="flex-none w-11 h-11 rounded-full bg-indigo-deep text-bone font-display font-bold flex items-center justify-center">
                    {c.nom.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{c.nom}</p>
                    <p className="text-sm text-ink/50">{c.telephone || "Pas de téléphone"}</p>
                    {estProprietaire && du > 0 && (
                      <p className="text-sm font-semibold text-clay">Doit {fcfa(du)} FCFA</p>
                    )}
                  </div>
                  {estProprietaire && (
                    <div className="text-right">
                      <p className="font-display font-bold text-indigo-deep">
                        {fcfa(comptes[c.id]?.achats ?? 0)} FCFA
                      </p>
                      <p className="text-[11px] text-ink/40">achats</p>
                    </div>
                  )}
                </div>

                {estProprietaire && du > 0 && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setClientEncaisse(c)}
                      className="flex-1 bg-bronze text-white text-sm font-semibold rounded-xl py-2.5"
                    >
                      Encaisser
                    </button>
                    {lien && (
                      <a
                        href={lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center border border-ink/15 text-ink/70 text-sm font-medium rounded-xl py-2.5"
                      >
                        Rappeler sur WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

      {clientEncaisse && businessId && (
        <FormulaireEncaisser
          businessId={businessId}
          client={clientEncaisse}
          compte={comptes[clientEncaisse.id]}
          onFerme={() => setClientEncaisse(null)}
          onRecharger={() => chargerTout(businessId, estProprietaire)}
          onFait={async () => {
            setClientEncaisse(null);
            await chargerTout(businessId, estProprietaire);
          }}
        />
      )}

      <BottomNav />
    </main>
  );
}

function FormulaireEncaisser({
  businessId,
  client,
  compte,
  onFerme,
  onRecharger,
  onFait,
}: {
  businessId: string;
  client: Client;
  compte: Compte | undefined;
  onFerme: () => void;
  onRecharger: () => Promise<void>;
  onFait: () => void;
}) {
  const du = compte?.du ?? 0;
  const [montant, setMontant] = useState(String(du));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Un identifiant par paiement : si on clique deux fois, il n'est enregistré qu'une fois
  const identifiants = useRef<Record<string, string>>({});

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const somme = Math.round(Number(montant));
    if (!Number.isFinite(somme) || somme <= 0) {
      setErreur("Entrez un montant valide.");
      return;
    }
    if (somme > du) {
      setErreur(`Ce client ne doit que ${fcfa(du)} FCFA.`);
      return;
    }

    setEnvoi(true);
    let restant = somme;
    for (const vente of compte?.ventes ?? []) {
      if (restant <= 0) break;
      const reste = vente.total - vente.montant_paye;
      if (reste <= 0) continue;
      const part = Math.min(restant, reste);
      const cle = `${vente.id}:${part}`;
      const identifiant = (identifiants.current[cle] ??= crypto.randomUUID());

      const { error } = await supabase.rpc("encaisser_paiement", {
        p_business: businessId,
        p_sale: vente.id,
        p_montant: part,
        p_client_uuid: identifiant,
      });
      if (error) {
        setEnvoi(false);
        setErreur(
          `${enFrancais(error.message)} Une partie du paiement a peut-être été enregistrée : vérifiez le solde du client.`
        );
        await onRecharger();
        return;
      }
      restant -= part;
    }

    setEnvoi(false);
    onFait();
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bone rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6">
        <h2 className="font-display text-xl font-bold text-indigo-deep">Encaisser un paiement</h2>
        <p className="text-sm text-ink/60 mt-1 mb-4">
          {client.nom} doit encore <span className="font-semibold text-clay">{fcfa(du)} FCFA</span>
        </p>

        <form onSubmit={valider} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-ink/70">Montant reçu (FCFA)</label>
            <input
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={du}
              className="input-field mt-1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setMontant(String(du))}
            className="text-sm font-medium text-indigo-deep underline"
          >
            Il paie tout ({fcfa(du)} FCFA)
          </button>

          {erreur && <p className="text-clay text-sm font-medium">{erreur}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onFerme}
              className="flex-1 py-3 rounded-xl border border-ink/15 font-medium text-ink/70"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi}
              className="flex-1 bg-bronze text-white font-display font-semibold rounded-xl py-3 disabled:opacity-50"
            >
              {envoi ? "Enregistrement..." : "Encaisser"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      setErreur(enFrancais(error.message));
      return;
    }
    onCree();
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bone rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6">
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
            <button type="submit" disabled={envoi} className="flex-1 bg-bronze text-white font-display font-semibold rounded-xl py-3 disabled:opacity-50">
              {envoi ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
