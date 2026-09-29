import { supabase } from "@/lib/supabase";

export async function commerceActuel() {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return null;

  const { data: membre } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(nom)")
    .eq("user_id", session.user.id)
    .eq("actif", true)
    .limit(1)
    .maybeSingle();

  if (!membre) return null;

  return {
    businessId: membre.business_id as string,
    role: membre.role as "owner" | "employee",
    nom: (membre.businesses as any)?.nom as string,
  };
}
