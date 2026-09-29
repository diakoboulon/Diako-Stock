"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function traiterLien() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (error) {
          setErreur(
            "Ce lien de confirmation n'est plus valable. Réessayez de vous connecter ou de vous inscrire."
          );
          return;
        }
        router.replace("/tableau-de-bord");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/tableau-de-bord");
      } else {
        router.replace("/connexion");
      }
    }
    traiterLien();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      {erreur ? (
        <p className="text-clay">{erreur}</p>
      ) : (
        <p className="text-ink/50">Un instant...</p>
      )}
    </main>
  );
}
