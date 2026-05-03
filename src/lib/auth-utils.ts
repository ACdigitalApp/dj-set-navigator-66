export function getFriendlyAuthErrorMessage(error: unknown, fallback: string) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";

  if (message.includes("Invalid login credentials")) {
    return "Email o password non corretti, oppure utente non autorizzato.";
  }

  if (message.includes("Email not confirmed")) {
    return "Devi confermare la tua email prima di accedere.";
  }

  if (message.includes("Password should be at least")) {
    return "La password non rispetta i requisiti minimi di sicurezza.";
  }

  if (message.includes("User not found")) {
    return "Utente non trovato.";
  }

  return fallback;
}

export function validateStrongPassword(password: string) {
  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  return {
    checks,
    valid: Object.values(checks).every(Boolean),
  };
}