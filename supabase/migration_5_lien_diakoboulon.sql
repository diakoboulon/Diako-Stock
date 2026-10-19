-- =====================================================================
-- DIAKO STOCK — MIGRATION 5 : ACTIVATION AUTOMATIQUE APRÈS PAIEMENT SUR DIAKOBOULON
-- À exécuter UNE fois dans Supabase > SQL Editor (projet de production).
-- Peut être relancée sans risque : elle ne supprime aucune donnée.
-- =====================================================================

-- 1. Mémoire des paiements déjà traités (une référence = une seule activation)
create table if not exists public.abonnements_paiements (
  reference  text primary key,
  email      text not null,
  plan       text not null,
  mois       int  not null,
  created_at timestamptz not null default now()
);
alter table public.abonnements_paiements enable row level security;
-- (aucune politique : personne ne la lit depuis l'application)

-- 2. Activation depuis Diakoboulon : ne traite jamais deux fois la même commande
create or replace function public.activer_abonnement_ref(
  p_email text, p_plan text, p_mois int, p_reference text
) returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_n int;
begin
  if coalesce(trim(p_reference), '') = '' then
    raise exception 'Référence de paiement manquante';
  end if;
  if p_plan not in ('standard', 'pro', 'business') then
    raise exception 'Plan inconnu : %', p_plan;
  end if;
  if p_mois not in (1, 12) then
    raise exception 'Durée invalide : %', p_mois;
  end if;

  -- Le compte doit exister AVANT d'enregistrer la référence
  if not exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Aucun compte Diako Stock avec l''email %', p_email;
  end if;

  insert into public.abonnements_paiements (reference, email, plan, mois)
  values (p_reference, lower(trim(p_email)), p_plan, p_mois)
  on conflict (reference) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return 'deja';
  end if;

  return public.activer_abonnement(p_email, p_plan, p_mois);
end
$$;

-- Réservée au serveur (clé service_role) : ni les visiteurs ni les clients connectés
revoke all on function public.activer_abonnement_ref(text, text, int, text) from public, anon, authenticated;
grant execute on function public.activer_abonnement_ref(text, text, int, text) to service_role;
grant execute on function public.activer_abonnement(text, text, int) to service_role;
