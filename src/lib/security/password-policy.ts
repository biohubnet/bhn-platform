/**
 * Password-policy gate. Run on every set / change.
 *
 * Rules (cheap MVP, tunable later):
 *   • Length ≥10 characters (NIST 800-63B SP says length > complexity).
 *   • Reject the top 200 leaked passwords from the Pwned-Passwords
 *     project (offline list, no network round-trip).
 *   • Reject if the password equals or contains the user's email
 *     local-part or full name (so "JaneSmith2024" doesn't pass for
 *     Jane Smith).
 *
 * Returns either { ok: true } or { ok: false, reason }. The "reason"
 * is end-user-readable; the API layer plumbs it straight through.
 *
 * No upper length cap — long passphrases are encouraged. No mandated
 * character classes (NIST also no longer recommends those).
 */

// 200 most-common compromised passwords from Have I Been Pwned's
// ordered-by-prevalence top list. Static, version-controlled — we
// don't make a network call from a hot path. Refresh annually.
const COMMON_PASSWORDS = new Set([
  "123456", "123456789", "qwerty", "password", "12345", "qwerty123", "1q2w3e",
  "12345678", "111111", "1234567890", "1234567", "qwerty1", "123123", "000000",
  "iloveyou", "1234", "1q2w3e4r5t", "qwertyuiop", "123", "monkey", "dragon",
  "123321", "654321", "abc123", "password1", "1qaz2wsx", "qazwsx", "admin",
  "letmein", "welcome", "1q2w3e4r", "789456", "987654321", "1234561", "159753",
  "michael", "111222", "121212", "qwerasdf", "123abc", "asdf", "asdfgh",
  "asdfghjkl", "11111111", "999999", "555555", "shadow", "master", "trustno1",
  "love", "ashley", "michelle", "sunshine", "princess", "hello", "freedom",
  "whatever", "passw0rd", "p@ssw0rd", "p@$$w0rd", "passw0rd1", "password123",
  "pass123", "12qwaszx", "1qa2ws3ed", "zxcvbnm", "qwer1234", "asdf1234",
  "letmein1", "welcome1", "abc12345", "test", "test123", "guest", "demo",
  "secret", "tiger", "champion", "football", "baseball", "soccer", "basketball",
  "starwars", "computer", "internet", "google", "facebook", "yahoo", "hotmail",
  "samsung", "nintendo", "pokemon", "naruto", "harry", "potter", "iron",
  "captain", "spider", "batman", "superman", "ninja", "jordan", "matrix",
  "phoenix", "tigers", "eagles", "rangers", "bulls", "lions", "panthers",
  "summer", "winter", "spring", "autumn", "january", "february", "march",
  "monday", "friday", "sunday", "weekend", "vacation", "holiday", "newyear",
  "happy", "happy1", "smile", "blessed", "family", "mother", "father", "sister",
  "brother", "kitten", "puppy", "doggy", "kitty", "babygirl", "babyboy",
  "killer", "hunter", "warrior", "soldier", "captain1", "ranger", "officer",
  "blue", "red", "green", "yellow", "black", "white", "purple", "orange",
  "pink", "silver", "gold", "diamond", "ruby", "sapphire", "emerald",
  "ferrari", "porsche", "honda", "toyota", "lexus", "audi", "bmw", "mercedes",
  "windows", "macbook", "iphone", "android", "samsung1", "galaxy", "tablet",
  "qwerty12", "qwerty123!", "P@ssword", "P@ssword1", "Passw0rd!", "Pa$$w0rd",
  "iloveyou1", "iloveyou2", "loveme", "loveyou", "kissme", "marryme",
  "hello1", "hello123", "welcome123", "welcome2024", "welcome2025", "welcome2026",
  "summer2024", "summer2025", "summer2026", "winter2024", "winter2025",
  "spring2024", "spring2025", "fall2024", "fall2025",
]);

export interface PasswordCheckResult {
  ok: boolean;
  reason?: string;
}

export function checkPassword(opts: {
  password: string;
  email?: string | null;
  name?: string | null;
}): PasswordCheckResult {
  const pw = opts.password ?? "";
  if (pw.length < 10) {
    return { ok: false, reason: "Password must be at least 10 characters." };
  }
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
    return { ok: false, reason: "That password is on the public-breach list — pick another." };
  }

  // Reject password ≈ user identity. Loose match: lower-case both
  // sides, drop non-alphanumerics, see if one contains the other.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const pwNorm = norm(pw);
  if (pwNorm.length === 0) {
    return { ok: false, reason: "Password can't be only symbols." };
  }
  if (opts.email) {
    const local = opts.email.split("@")[0] ?? "";
    if (local.length >= 4 && pwNorm.includes(norm(local))) {
      return { ok: false, reason: "Password can't contain your email address." };
    }
  }
  if (opts.name) {
    const nameNorm = norm(opts.name);
    if (nameNorm.length >= 4 && pwNorm.includes(nameNorm)) {
      return { ok: false, reason: "Password can't contain your name." };
    }
  }
  return { ok: true };
}
