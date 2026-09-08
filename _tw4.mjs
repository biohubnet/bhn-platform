import { compile } from 'tailwindcss';
import fs from 'node:fs';
const ROOT='/Users/ruilinyuan/Documents/Claude/Projects/bhn-platform';
const c = await compile(fs.readFileSync(ROOT+'/src/app/globals.css','utf8'), { base: ROOT,
  loadModule: async (id) => ({ module: (await import(id)).default ?? (()=>{}), base: ROOT }),
  loadStylesheet: async (id, base) => id==='tailwindcss' ? { base, content: fs.readFileSync(ROOT+'/node_modules/tailwindcss/index.css','utf8') } : { base, content: '' }});
const out = c.build(['grid','gap-5','grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]','2xl:grid-cols-3','max-w-[65ch]','line-clamp-12','text-muted','text-subtle']);
const lines = out.split('\n');
lines.forEach((l,i)=>{ if(/grid-template-columns|max-width:\s*65ch|line-clamp|width >= 96rem|\.text-muted|\.text-subtle/.test(l)) console.log(String(i).padStart(5)+': '+l.trim().slice(0,150)); });
