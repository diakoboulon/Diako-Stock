"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const fcfaDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

type Resume = {
  commerces: number;
  nouveaux_7j: number;
  suspendus: number;
  par_plan: Record<string, number>;
  essais_bientot: number;
  modules_actifs: Record<string, number>;
};

type Commerce = {
  business_id: string;
  nom: string;
  ville: string | null;
  telephone: string | null;
  secteur: string | null;
  statut: string;
  plan: string;
  expire_le: string | null;
  proprietaire: string | null;
  email: string | null;
  nb_produits: number;
  nb_ventes: number;
  created_at: string;
};

const NOM_PLAN: Record<string, string> = {
  gratuit: "Gratuit",
  standard: "Standard",
  pro: "Pro",
  business: "Business",
};

function lienWhatsApp(telephone: string | null, nom: string) {
  const brut = (telephone ?? "").replace(/[^\d+]/g, "");
  if (!brut) return null;
  let numero = brut.startsWith("+") ? brut.slice(1) : brut.startsWith("00") ? brut.slice(2) : brut;
  if (numero.length === 8) numero = "223" + numero; // numéro malien sans indicatif
  const message = `Bonjour, c'est l'équipe Diako Business. Nous vous écrivons au sujet de ${nom}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "payants" | "gratuits" | "suspendus">("tous");
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    const [r, l] = await Promise.all([
      supabase.rpc("admin_resume"),
      supabase.rpc("admin_liste_commerces"),
    ]);
    if (r.error || l.error) {
      setErreur(
        "Impossible de charger l'administration : " +
          (r.error?.message || l.error?.message) +
          " (la migration 9 est-elle bien installée dans Supabase ?)"
      );
      return;
    }
    setResume(r.data as Resume);
    setCommerces((l.data ?? []) as Commerce[]);
    setErreur(null);
  }

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) {
        router.push("/connexion");
        return;
      }
      const { data: estAdmin } = await supabase.rpc("est_admin_plateforme");
      if (estAdmin !== true) {
        // Un client n'a rien à faire ici : retour dans son module.
        router.replace("/tableau-de-bord");
        return;
      }
      await charger();
      setChargement(false);
    }
    init();
  }, [router]);

  async function changerStatut(c: Commerce) {
    const suspendre = c.statut === "actif";
    const question = suspendre
      ? `Suspendre « ${c.nom} » ? Ses utilisateurs ne pourront plus utiliser l'application.`
      : `Réactiver « ${c.nom} » ?`;
    if (!window.confirm(question)) return;

    setEnCours(c.business_id);
    const { error } = await supabase.rpc("admin_changer_statut", {
      p_business: c.business_id,
      p_statut: suspendre ? "suspendu" : "actif",
    });
    setEnCours(null);
    if (error) {
      window.alert("Impossible de modifier le statut : " + error.message);
      return;
    }
    await charger();
  }

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">
        Chargement...
      </main>
    );
  }

  const visibles = commerces
    .filter((c) => {
      const texte = `${c.nom} ${c.proprietaire ?? ""} ${c.email ?? ""} ${c.telephone ?? ""} ${c.ville ?? ""}`.toLowerCase();
      return texte.includes(recherche.toLowerCase());
    })
    .filter((c) => {
      if (filtre === "payants") return c.plan !== "gratuit" && c.statut === "actif";
      if (filtre === "gratuits") return c.plan === "gratuit" && c.statut === "actif";
      if (filtre === "suspendus") return c.statut !== "actif";
      return true;
    });

  const plans = resume?.par_plan ?? {};

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-3xl mx-auto pb-16">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-ink/50 text-sm">Administration</p>
          <h1 className="font-display text-2xl font-bold text-indigo-deep">Diako Business</h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/connexion");
          }}
          className="text-xs text-ink/40 border border-ink/15 rounded-full px-3 py-1.5 mt-1"
        >
          Déconnexion
        </button>
      </header>

      {erreur && (
        <div className="bg-white border border-clay/40 rounded-2xl p-4 mb-5 text-clay text-sm font-medium">
          {erreur}
        </div>
      )}

      {resume && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Carte valeur={resume.commerces} titre="Commerces" />
            <Carte valeur={resume.nouveaux_7j} titre="Nouveaux (7 jours)" />
            <Carte valeur={resume.suspendus} titre="Suspendus" />
            <Carte valeur={resume.essais_bientot} titre="Essais qui finissent bientôt" />
          </div>

          <div className="bg-white border border-ink/10 rounded-2xl p-4 mb-6">
            <p className="text-sm text-ink/60 mb-2">Abonnements Diako Stock</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {["gratuit", "standard", "pro", "business"].map((p) => (
                <div key={p}>
                  <p className="font-display text-xl font-bold text-indigo-deep">{plans[p] ?? 0}</p>
                  <p className="text-xs text-ink/50">{NOM_PLAN[p]}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <h2 className="font-display font-bold text-indigo-deep mb-3">Commerces inscrits</h2>

      <input
        className="input-field mb-3"
        placeholder="Rechercher (nom, e-mail, téléphone, ville)..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      <div className="grid grid-cols-4 gap-2 mb-5">
        {(
          [
            ["tous", "Tous"],
            ["payants", "Payants"],
            ["gratuits", "Gratuits"],
            ["suspendus", "Suspendus"],
          ] as const
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            onClick={() => setFiltre(valeur)}
            className={`py-2 rounded-xl text-sm font-medium border ${filtre === valeur ? "bg-indigo-deep text-bone border-indigo-deep" : "bg-white text-ink/60 border-ink/15"}`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="bg-white border border-ink/10 rounded-3xl text-center py-10 px-6 text-ink/60">
          Aucun commerce ne correspond.
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((c) => {
            const lien = lienWhatsApp(c.telephone, c.nom);
            const suspendu = c.statut !== "actif";
            return (
              <div
                key={c.business_id}
                className={`bg-white border rounded-2xl p-4 ${suspendu ? "border-clay/40" : "border-ink/10"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.nom}</p>
                    <p className="text-sm text-ink/50">
                      {[c.ville, c.secteur].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-none">
                    <span className="inline-block text-xs font-semibold rounded-full px-3 py-1 bg-bone text-indigo-deep">
                      {NOM_PLAN[c.plan] ?? c.plan}
                    </span>
                    {suspendu && <p className="text-xs font-semibold text-clay mt-1">Suspendu</p>}
                  </div>
                </div>

                <div className="text-sm text-ink/70 mt-3 space-y-0.5">
                  {c.proprietaire && <p>👤 {c.proprietaire}</p>}
                  {c.email && <p>✉️ {c.email}</p>}
                  {c.telephone && <p>📞 {c.telephone}</p>}
                </div>

                <p className="text-xs text-ink/50 mt-3">
                  {c.nb_produits} produit{c.nb_produits > 1 ? "s" : ""} · {c.nb_ventes} vente
                  {c.nb_ventes > 1 ? "s" : ""} · inscrit le {fcfaDate(c.created_at)}
                  {c.plan !== "gratuit" && c.expire_le ? ` · plan jusqu'au ${fcfaDate(c.expire_le)}` : ""}
                </p>

                <div className="flex gap-2 mt-3">
                  {lien && (
                    <a
                      href={lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center border border-ink/15 text-ink/70 text-sm font-medium rounded-xl py-2"
                    >
                      WhatsApp
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex-1 text-center border border-ink/15 text-ink/70 text-sm font-medium rounded-xl py-2"
                    >
                      E-mail
                    </a>
                  )}
                  <button
                    onClick={() => changerStatut(c)}
                    disabled={enCours === c.business_id}
                    className={`flex-1 text-sm font-semibold rounded-xl py-2 disabled:opacity-50 ${suspendu ? "bg-bronze text-white" : "border border-clay/40 text-clay"}`}
                  >
                    {enCours === c.business_id ? "..." : suspendu ? "Réactiver" : "Suspendre"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Carte({ valeur, titre }: { valeur: number; titre: string }) {
  return (
    <div className="bg-white border border-ink/10 rounded-2xl p-4">
      <p className="font-display text-2xl font-bold text-indigo-deep">{valeur}</p>
      <p className="text-xs text-ink/50 mt-0.5">{titre}</p>
    </div>
  );
}
