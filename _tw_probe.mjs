import { compile } from 'tailwindcss';
import fs from 'node:fs';
const ROOT='/Users/ruilinyuan/Documents/Claude/Projects/bhn-platform';
const css = fs.readFileSync(ROOT+'/src/app/globals.css','utf8');
const compiler = await compile(css, {
  base: ROOT,
  loadModule: async (id) => ({ module: (await import(id)).default ?? (()=>{}), base: ROOT }),
  loadStylesheet: async (id, base) => {
    if (id === 'tailwindcss') return { base, content: fs.readFileSync(ROOT+'/node_modules/tailwindcss/index.css','utf8') };
    if (id.startsWith('tailwindcss/')) return { base, content: fs.readFileSync(ROOT+'/node_modules/'+id,'utf8') };
    return { base, content: '' };
  }});
const candidates = ['grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]','2xl:grid-cols-3','max-w-[65ch]','line-clamp-12','line-clamp-9','min-h-[40px]','min-h-[60px]','sr-only','ml-auto','items-center','gap-y-1','gap-x-4','mt-0.5','py-2.5','text-xl','flex-1','truncate','min-w-0','border-t','px-4','mt-1','mt-2','tabular-nums','whitespace-nowrap','self-center','hidden','sm:block','h-px','bg-line','text-muted','text-subtle','text-fg-muted','text-fg-subtle','line-clamp-5','line-clamp-6','line-clamp-7','line-clamp-8','max-w-screen-2xl','tracking-[0.16em]','text-[13px]','leading-[20px]','text-[25px]','text-[10.5px]','leading-[14px]','tabular-nums','bg-line-strong','min-w-8','gap-x-4','flex-wrap','items-baseline','shrink-0','-mt-1.5','-mr-1.5','max-w-full','text-[16px]','tracking-[-0.01em]','tracking-[-0.015em]','text-pretty','hyphens-auto','line-clamp-3','space-y-12','border-line','text-2xl','text-[24px]','leading-[30px]','mt-2.5','py-3','px-4','min-h-8','bg-elevated','ring-line'];
const out = compiler.build(candidates);
for (const c of candidates) {
  const lit = '.'+c.replace(/([.[\]()#*+?^$|\\])/g,'\\$1');
  console.log((out.includes(lit) ? 'OK   ' : 'MISS ') + c);
}
fs.writeFileSync('/tmp/tw_out.css', out);
console.log('--- bytes', out.length);
