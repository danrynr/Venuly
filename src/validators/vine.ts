// Singleton import — resolved once at startup, not re-imported per request.
// This ensures Vercel's bundler (NFT) can trace the ESM dynamic import correctly.
let _vine: any = null;

export async function getVine() {
  if (!_vine) {
    const mod = await import("@vinejs/vine");
    _vine = mod.default;
  }
  return _vine as typeof import("@vinejs/vine").default;
}
