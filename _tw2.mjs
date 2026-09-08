import { compile } from 'tailwindcss';
import fs from 'node:fs';
const ROOT='/Users/ruilinyuan/Documents/Claude/Projects/bhn-platform';
const css = fs.readFileSync(ROOT+'/src/app/globals.css','utf8');
const c = await compile(css, { base: ROOT,
  loadModule: async (id) => ({ module: (await import(id)).default ?? (()=>{}), base: ROOT }),
  loadStylesheet: async (id, base) => id==='tailwindcss'
    ? { base, content: fs.readFileSync(ROOT+'/node_modules/tailwindcss/index.css','utf8') }
    : { base, content: '' }});
const cands = [
 'grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]',
 'grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]',
 '2xl:grid-cols-3','xl:grid-cols-3','lg:grid-cols-2','sm:grid-cols-2','md:grid-cols-1',
 'min-[1700px]:grid-cols-3','max-w-[65ch]','line-clamp-12'];
for (const x of cands) {
  const out = c.build([x]);
  const body = out.split('\n').filter(l=>l.includes('{')||l.includes('grid-template')||l.includes('@media')).slice(0,6).join(' ~ ');
  console.log((out.trim().length>0?'GEN  ':'NONE ')+x+'   >>> '+body.slice(0,190));
}
