-- =====================================================================
-- DIAKO STOCK — MIGRATION 4 : ABONNEMENTS SELON LE NOMBRE DE PRODUITS
-- À exécuter UNE fois dans Supabase > SQL Editor (projet de production).
-- Peut être relancée sans risque : elle ne supprime aucune donnée.
-- =====================================================================

-- 1. Plan de chaque commerce (pas de ligne = plan Gratuit)
create table if not exists public.abonnements (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan        text not null default 'gratuit'
              check (plan in ('gratuit', 'standard', 'pro', 'business')),
  expire_le   timestamptz,
  updated_at  timestamptz not null default now()
);

-- Historique des activations (pour vos comptes)
create table if not exists public.abonnements_historique (
  id          bigserial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan        text not null,
  mois        int  not null,
  expire_le   timestamptz not null,
  created_at  timestamptz not null default now()
);

-- 2. Sécurité : les membres d'un commerce peuvent LIRE leur plan,
--    personne ne peut le modifier depuis l'application (seulement vous, via SQL).
alter table public.abonnements enable row level security;
alter table public.abonnements_historique enable row level security;

drop policy if exists "membres lisent leur abonnement" on public.abonnements;
create policy "membres lisent leur abonnement" on public.abonnements
  for select using (
    exists (
      select 1 from public.business_members m
      where m.business_id = abonnements.business_id
        and m.user_id = auth.uid()
        and m.actif = true
    )
  );
-- (aucune politique insert/update/delete : impossible de s'auto-attribuer un plan)

-- 3. Limite de produits par plan (null = illimité)
create or replace function public.limite_produits(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'standard' then 150
    when 'pro'      then 500
    when 'business' then null
    else 20
  end
$$;

-- Plan réellement en vigueur (un plan expiré redevient Gratuit)
create or replace function public.plan_effectif(p_business uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select plan from public.abonnements
      where business_id = p_business
        and (expire_le is null or expire_le > now())),
    'gratuit')
$$;

-- 4. Blocage automatique quand la limite est atteinte
create or replace function public.verifier_limite_produits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_limite int;
  v_nb int;
begin
  if coalesce(new.actif, true) = false then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.actif, true) = true then
    return new;
  end if;

  v_plan := public.plan_effectif(new.business_id);
  v_limite := public.limite_produits(v_plan);
  if v_limite is null then
    return new;
  end if;

  select count(*) into v_nb
  from public.products
  where business_id = new.business_id
    and actif = true
    and id <> new.id;

  if v_nb >= v_limite then
    raise exception 'LIMITE_PLAN: Votre plan % permet % produits. Passez au plan supérieur pour en ajouter.',
      initcap(v_plan), v_limite;
  end if;
  return new;
end
$$;

drop trigger if exists trg_limite_produits on public.products;
create trigger trg_limite_produits
  before insert or update of actif on public.products
  for each row execute function public.verifier_limite_produits();

-- 5. Activation d'un abonnement (à lancer par VOUS dans le SQL Editor après paiement)
--    Exemple : select public.activer_abonnement('client@gmail.com', 'standard', 1);
--    Exemple annuel : select public.activer_abonnement('client@gmail.com', 'pro', 12);
create or replace function public.activer_abonnement(p_email text, p_plan text, p_mois int default 1)
returns text language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid;
  v_business uuid;
  v_depart timestamptz;
  v_exp timestamptz;
begin
  if p_plan not in ('gratuit', 'standard', 'pro', 'business') then
    raise exception 'Plan inconnu : % (choisir gratuit, standard, pro ou business)', p_plan;
  end if;
  if p_mois < 1 then
    raise exception 'Le nombre de mois doit être au moins 1';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte Diako Stock avec l''email %', p_email;
  end if;

  select business_id into v_business
  from public.business_members
  where user_id = v_user and role = 'owner' and actif = true
  limit 1;
  if v_business is null then
    raise exception 'Aucun commerce trouvé pour %', p_email;
  end if;

  -- Si un abonnement du même plan est encore en cours, on prolonge à partir de sa fin
  select case when plan = p_plan and expire_le > now() then expire_le else now() end
    into v_depart
  from public.abonnements where business_id = v_business;
  v_exp := coalesce(v_depart, now()) + make_interval(months => p_mois);

  insert into public.abonnements (business_id, plan, expire_le, updated_at)
  values (v_business, p_plan, v_exp, now())
  on conflict (business_id) do update
    set plan = excluded.plan, expire_le = excluded.expire_le, updated_at = now();

  insert into public.abonnements_historique (business_id, plan, mois, expire_le)
  values (v_business, p_plan, p_mois, v_exp);

  return format('Plan %s activé pour %s jusqu''au %s', p_plan, p_email, to_char(v_exp, 'DD/MM/YYYY'));
end
$$;

-- Seul vous (SQL Editor) pouvez activer un plan
revoke all on function public.activer_abonnement(text, text, int) from public, anon, authenticated;
grant execute on function public.plan_effectif(uuid) to authenticated;
grant select on public.abonnements to authenticated;

-- 6. Voir tous les abonnements en cours (requête pratique pour vous)
-- select b.nom, a.plan, a.expire_le from public.abonnements a join public.businesses b on b.id = a.business_id order by a.expire_le;
