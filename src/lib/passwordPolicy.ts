import "server-only";
import { createHash } from "crypto";

export type PasswordProblem = "password" | "breached";

/**
 * Checks a new password: 8–200 characters and not in a known data breach.
 * The breach check uses Have I Been Pwned's k-anonymity API: only the first five
 * characters of the password's SHA-1 hash leave the server, never the password.
 * If that service can't be reached, the password is allowed rather than blocking sign-up.
 */
export async function checkNewPassword(password: string): Promise<PasswordProblem | null> {
  if (password.length < 8 || password.length > 200) return "password";
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "ProjectLocker" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const suffix = sha1.slice(5);
    for (const line of (await res.text()).split("\n")) {
      const [hash, count] = line.trim().split(":");
      if (hash === suffix && Number(count) > 0) return "breached";
    }
  } catch {
    // network trouble: don't block the user
  }
  return null;
}
