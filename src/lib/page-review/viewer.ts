import { jwtVerify, SignJWT } from "jose";

const ISSUER = "bhn-training-platform";
const AUDIENCE = "page-review";

export interface PageReviewViewer {
  reviewId: string;
  userId: string;
  name: string;
}

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not configured.");
  return new TextEncoder().encode(value);
}

function cleanName(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Team member";
}

export async function createPageReviewViewerToken(viewer: PageReviewViewer) {
  return new SignJWT({ reviewId: viewer.reviewId, name: cleanName(viewer.name) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(viewer.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyPageReviewViewerToken(
  token: string,
  reviewId: string,
): Promise<PageReviewViewer | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      payload.reviewId !== reviewId ||
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      reviewId,
      userId: payload.sub,
      name: cleanName(payload.name),
    };
  } catch {
    return null;
  }
}
