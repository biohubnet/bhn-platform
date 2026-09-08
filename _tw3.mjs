import { compile } from 'tailwindcss';
import fs from 'node:fs';
const ROOT='/Users/ruilinyuan/Documents/Claude/Projects/bhn-platform';
const css = fs.readFileSync(ROOT+'/src/app/globals.css','utf8');
const c = await compile(css, { base: ROOT,
  loadModule: async (id) => ({ module: (await import(id)).default ?? (()=>{}), base: ROOT }),
  loadStylesheet: async (id, base) => id==='tailwindcss'
    ? { base, content: fs.readFileSync(ROOT+'/node_modules/tailwindcss/index.css','utf8') }
    : { base, content: '' }});
const base = c.build([]).length;
for (const x of ['grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]','2xl:grid-cols-3','max-w-[65ch]','line-clamp-12','sm:grid-cols-2','min-[1700px]:grid-cols-3','fake-nonsense-class-xyz']) {
  const out = c.build([x]);
  const extra = out.slice(base>0 ? 0 : 0);
  // find lines mentioning grid-template-columns / max-width / line-clamp that are NOT in base
  const baseOut = c.build([]);
  const newLines = out.split('\n').filter(l => !baseOut.includes(l.trim()) && l.trim());
  console.log('--- '+x+'  (delta '+(out.length-base)+' bytes)');
  console.log('    '+newLines.slice(0,8).map(s=>s.trim()).join('  |  ').slice(0,240));
}
