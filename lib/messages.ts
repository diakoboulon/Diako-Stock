// Traduit en français les messages d'erreur techniques (Supabase, réseau...).
// Les messages déjà écrits en français (par exemple ceux de la base de données) passent tels quels.

const TRADUCTIONS: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou mot de passe incorrect."],
  [/email not confirmed|not confirmed/i, "Votre adresse e-mail n'est pas encore confirmée. Ouvrez le message de confirmation reçu par e-mail."],
  [/user already registered|already been registered|already registered/i, "Un compte existe déjà avec cette adresse e-mail."],
  [/password should be at least|at least \d+ characters/i, "Le mot de passe est trop court."],
  [/weak password|password is too weak|should contain at least one character/i, "Le mot de passe est trop faible. Ajoutez des lettres et des chiffres."],
  [/new password should be different/i, "Le nouveau mot de passe doit être différent de l'ancien."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "L'adresse e-mail n'est pas valide."],
  [/for security purposes|only request this after/i, "Pour des raisons de sécurité, patientez quelques secondes avant de réessayer."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Trop de tentatives. Patientez quelques minutes avant de réessayer."],
  [/signups? (is |are )?(not allowed|disabled)/i, "Les inscriptions sont momentanément fermées."],
  [/jwt expired|session expired|invalid jwt|refresh token|auth session missing/i, "Votre session a expiré. Veuillez vous reconnecter."],
  [/failed to fetch|fetch failed|load failed|network ?error|networkerror/i, "Problème de connexion. Vérifiez votre connexion Internet et réessayez."],
  [/timeout|timed out/i, "Le serveur met trop de temps à répondre. Veuillez réessayer."],
  [/row-level security|permission denied|not authorized|unauthorized/i, "Action non autorisée."],
  [/duplicate key/i, "Cet élément existe déjà."],
  [/foreign key/i, "Cette opération n'est pas possible : l'élément est lié à d'autres données."],
  [/check constraint/i, "Une valeur saisie n'est pas valide."],
  [/null value in column|not-null/i, "Un champ obligatoire est vide."],
];

// Mots anglais courants : si un message en contient, on ne l'affiche pas tel quel.
const MOTS_ANGLAIS =
  /\b(the|is|are|not|error|failed|invalid|cannot|unable|must|should|already|exceeded|denied|expired|found|required|missing|violates|constraint|permission|request|token|session|network|too|please|could|couldn't|wrong|something)\b/i;

export function enFrancais(
  message: string | null | undefined,
  parDefaut = "Une erreur est survenue. Veuillez réessayer."
): string {
  const texte = (message ?? "").trim();
  if (!texte) return parDefaut;

  for (const [motif, traduction] of TRADUCTIONS) {
    if (motif.test(texte)) return traduction;
  }
  if (MOTS_ANGLAIS.test(texte)) return parDefaut;
  return texte;
}
