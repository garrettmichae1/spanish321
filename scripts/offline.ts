import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
function files(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((f) =>
    f.isDirectory() ? files(`${path}/${f.name}`) : [`${path}/${f.name}`],
  );
}
const paths = files("dist").filter((p) => !p.endsWith("sw.js"));
const version = createHash("sha256")
  .update(paths.map((p) => readFileSync(p)).join(""))
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  "dist/sw.js",
  `const CACHE='spanish321-${version}';const ASSETS=${JSON.stringify(["./", ...paths.map((p) => "./" + p.slice(5))])};self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('spanish321-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(c=>c.match(event.request,{ignoreVary:true})).then(hit=>hit||fetch(event.request)));});`,
);
console.log("Offline app cache generated:", version);
