// @vinejs/vine is ESM-only. Vercel compiles TypeScript with esbuild which
// converts import("@vinejs/vine") → require("@vinejs/vine") in CJS output,
// breaking at runtime. Using new Function() hides the import from esbuild
// so Node.js performs the real dynamic ESM import at runtime.
let _vine: any = null;

const _dynamicImport = new Function("m", "return import(m)");

export async function getVine(): Promise<typeof import("@vinejs/vine").default> {
  if (!_vine) {
    const mod = await _dynamicImport("@vinejs/vine");
    _vine = mod.default;
  }
  return _vine;
}
