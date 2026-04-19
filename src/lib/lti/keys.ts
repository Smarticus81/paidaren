import * as jose from "jose";
import type { JWK, JWTPayload } from "jose";

let cachedKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey; jwk: JWK; kid: string } | null = null;

export async function getOrCreateKeyPair() {
  if (cachedKeyPair) return cachedKeyPair;

  // Generate a key pair. In production, keys should be stored persistently.
  // The extractable flag must be true so we can export the public key as JWK.
  const { publicKey, privateKey } = await jose.generateKeyPair("RS256", { extractable: true });
  const jwk = await jose.exportJWK(publicKey);
  const kid = await jose.calculateJwkThumbprint(jwk);
  jwk.kid = kid;
  jwk.alg = "RS256";
  jwk.use = "sig";

  cachedKeyPair = { publicKey, privateKey, jwk, kid };
  return cachedKeyPair;
}

export async function getJWKS(): Promise<{ keys: JWK[] }> {
  const { jwk } = await getOrCreateKeyPair();
  return { keys: [jwk] };
}

export async function signJwt(payload: JWTPayload, audience: string): Promise<string> {
  const { privateKey, kid } = await getOrCreateKeyPair();
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience(audience)
    .setIssuer(process.env.APP_URL!)
    .sign(privateKey);
}

export async function verifyLtiToken(idToken: string, platform: { issuer: string; clientId: string; jwksUri: string }) {
  const jwks = jose.createRemoteJWKSet(new URL(platform.jwksUri));
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: platform.issuer,
    audience: platform.clientId,
  });
  return payload;
}
