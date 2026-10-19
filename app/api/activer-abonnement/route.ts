import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Porte d'entrée RÉSERVÉE à Diakoboulon : après un paiement confirmé là-bas,
// Diakoboulon appelle cette adresse pour activer le plan du commerçant.
// Sécurité : clé secrète commune (STOCK_LIEN_SECRET) + clé serveur Supabase gardée sur Vercel.
export const dynamic = "force-dynamic";

function secretOk(recu: string, attendu: string): boolean {
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const attendu = (process.env.STOCK_LIEN_SECRET || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!attendu || !serviceKey || !url) {
    return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  }

  const recu = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!recu || !secretOk(recu, attendu)) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }
  const email = String(body.email || "").trim();
  const plan = String(body.plan || "");
  const mois = Number(body.mois);
  const reference = String(body.reference || "").trim();
  if (!email || !reference || !["standard", "pro", "business"].includes(plan) || ![1, 12].includes(mois)) {
    return NextResponse.json({ ok: false, error: "Données invalides" }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("activer_abonnement_ref", {
    p_email: email, p_plan: plan, p_mois: mois, p_reference: reference,
  });
  if (error) {
    console.error("Activation abonnement refusée :", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
  }
  return NextResponse.json({ ok: true, deja: data === "deja", message: data });
}
