/**
 * Lightweight skill-match scorer.
 *
 * Takes the folder's JD body + the linked resume's structured
 * content. Pulls candidate skill phrases out of the JD (multi-word
 * domain-y terms, single tech-y nouns) and checks if each one
 * appears in the resume. Returns a per-skill present/missing list
 * and an overall match percentage.
 *
 * Pure heuristic, no AI. The point isn't a perfect parser — it's a
 * fast signal that tells a trainee "you've covered 14 of these 18
 * keywords; here are the 4 you should add" before they submit. Wrong
 * matches are fine; missed matches are visibly surfaceable as chips.
 *
 * Used by the JD tab's "Skill match" panel and the folder card's
 * "N/M skills" chip on the index page.
 */
import type { ResumeContent } from "@/lib/resume/types";

/** Words too generic to be skill candidates. Built up empirically
 *  from JD-text noise; not exhaustive but covers the obvious. */
const STOPWORDS = new Set([
  "the","and","for","with","that","this","from","have","will","you","your",
  "you'll","they","their","our","ours","but","not","into","also","such","any",
  "all","are","was","were","being","been","has","had","its","than","then",
  "well","more","most","very","upon","over","under","onto","each","other",
  "would","could","should","must","when","what","which","while","whose",
  "about","through","across","both","either","neither","because","since",
  "team","teams","work","working","based","help","helps","helping","make",
  "makes","made","ensure","ensures","ensuring","support","supporting","new",
  "key","role","roles","position","positions","candidate","candidates",
  "ability","able","strong","excellent","good","great","required","preferred",
  "minimum","plus","ideal","ideally","experience","experiences","year","years",
  "degree","degrees","skill","skills","etc","including","include","includes",
  "manage","manages","managing","management","drive","drives","driven","driving",
  "lead","leads","leading","build","builds","building","built","develop",
  "develops","developing","developed","create","creates","creating","created",
  "deliver","delivers","delivering","delivered","ensure","please","apply",
  "application","applications","applicant","applicants","may","one","two",
  "three","four","five","six","seven","eight","nine","ten","day","days",
  "week","weeks","month","months","year","quarter","quarters","time","times",
  "company","companies","organization","organizations","department","group",
  "groups","business","businesses","employee","employees","employer","employers",
  "people","person","persons","individual","individuals","candidate","level",
  "levels","position","positions","opportunity","opportunities","environment",
  "environments","culture","cultures","value","values","vision","mission",
  "diverse","diversity","inclusive","inclusion","equity","fair","fairly",
  "talented","committed","engaged","engagement","passionate","passion",
  "client","clients","customer","customers","partner","partners","vendor",
  "vendors","stakeholder","stakeholders","colleague","colleagues","peer",
  "peers","direct","directly","indirect","indirectly","relevant","related",
  "across","within","without","between","among","along","despite","during",
  "before","after","around","towards","toward","via","per","etc","eg","ie",
  "may","might","can","cannot","can't","won't","don't","didn't","wouldn't",
  "shouldn't","couldn't","isn't","aren't","wasn't","weren't","hasn't","haven't",
  "hadn't","mustn't","needn't","oughtn't","let","gives","given","getting",
  "getting","gets","got","goes","gone","going","comes","came","coming",
  "ours","yours","theirs","mine","this","these","those","such","like",
  "another","others","another","much","many","some","several","every","always",
  "often","never","sometimes","usually","occasionally","once","twice","again",
  "yet","still","already","just","only","even","ever","further","furthermore",
  "moreover","however","therefore","thus","hence","accordingly","consequently",
  "otherwise","instead","besides","meanwhile","afterwards","beforehand",
  "next","previous","first","second","third","last","final","initial","early",
  "late","later","sooner","laterally","ultimately","eventually","finally",
  "currently","recently","previously","historically","traditionally","typically",
  "generally","specifically","particularly","especially","mainly","mostly",
  "largely","wholly","entirely","completely","fully","partly","partially",
  "relatively","comparatively","approximately","roughly","exactly","precisely",
  "almost","nearly","about","around","approximately","roughly","exactly",
  "less","least","fewer","most","more","much","many","plenty","lots","few",
  "tiny","small","tall","short","long","wide","narrow","wide","high","low",
  "big","large","huge","massive","tiny","minute","minor","major","main",
  "primary","secondary","tertiary","extra","additional","further","another",
  "different","similar","same","alike","identical","unique","various","varied",
  "multiple","single","several","numerous","countless","limited","unlimited",
  "open","closed","near","far","close","distant","local","global","remote",
  "onsite","hybrid","onsite","offshore","onshore","internal","external",
  "online","offline","virtual","physical","digital","analog","manual",
  "automated","automatic","semi-automatic","fully","semi","quasi","pseudo",
  "non","sub","super","ultra","mega","micro","macro","mini","maxi","midi",
  "yes","no","maybe","perhaps","possibly","probably","certainly","definitely",
  "absolutely","exactly","precisely","clearly","obviously","apparently",
  "supposedly","allegedly","reportedly","reputedly","ostensibly","seemingly",
]);

/** Domain-y terms we ALWAYS want to surface as skill candidates even
 *  if they're short. Lowercase. Augments the heuristic by giving
 *  recognised acronyms a free pass. */
const FORCE_CANDIDATES = new Set([
  "gmp","gxp","glp","sop","mlr","kol","ich","fda","ema","hpra","fda",
  "ide","ind","nda","bla","clr","ich","crm","crm","cdmo","cmo","cmc",
  "ms","sql","aws","gcp","azure","jvm","jpa","tdd","bdd","ci","cd",
  "api","sdk","ide","ide","cli","gui","ssh","tls","ssl","oauth","jwt",
  "qa","qc","ux","ui","ml","ai","nlp","cv","rl","gpu","cpu","ram",
  "ppi","kpi","sla","mvp","poc","b2b","b2c","saas","paas","iaas",
  "css","html","sass","tsx","jsx","seo","sem","ppc","crm","erp",
  "hr","rh","cfo","cto","ceo","cmo","ciso","coo","sre","devops","cicd",
  "rdbms","etl","elt","olap","oltp","crud","rest","grpc","graphql",
  "json","xml","yaml","csv","tsv","pdf","docx","xlsx","pptx",
  "python","java","go","rust","ruby","php","scala","kotlin","swift",
  "react","vue","svelte","next.js","next","nuxt","angular","ember",
  "node","deno","bun","django","flask","rails","laravel","spring",
  "kubernetes","docker","terraform","ansible","jenkins","github",
  "gitlab","bitbucket","jira","confluence","slack","figma","notion",
  "tableau","powerbi","looker","snowflake","databricks","redshift",
  "postgresql","postgres","mysql","mongodb","redis","elasticsearch",
  "kafka","rabbitmq","pulsar","spark","hadoop","flink","airflow",
  "tensorflow","pytorch","keras","sklearn","numpy","pandas","matplotlib",
  "scipy","jupyter","r","stata","spss","sas",
  "hplc","gc","ms","nmr","ir","uv","vis","spr","elisa","pcr","qpcr",
  "rt-pcr","ddpcr","ngs","sanger","crispr","cas9","cho","hek","ipsc",
  "esc","msc","cd4","cd8","facs","flow","western","blot","sds-page",
  "rt","pcr","qrt","luminex","ihc","ish","fish","mri","ct","pet","spect",
]);

export interface SkillMatch {
  /** Lowercased candidate term as it appears in the JD. */
  term: string;
  /** Was the term found in the resume content? */
  present: boolean;
  /** Frequency in the JD — higher = more important to match. */
  jdHits: number;
}

export interface SkillMatchResult {
  total: number;
  matched: number;
  /** Top 30 candidates ranked by jdHits then alpha. */
  skills: SkillMatch[];
  /** 0–100 score: matched / total. */
  percent: number;
}

const MAX_CANDIDATES = 30;

/** Extract skill candidates from JD text, score against resume. */
export function scoreSkillMatch(
  jdText: string,
  resumeContent: ResumeContent | null | undefined,
): SkillMatchResult {
  const jd = (jdText ?? "").trim();
  if (jd.length === 0) {
    return { total: 0, matched: 0, skills: [], percent: 0 };
  }

  // Flatten resume content into a single lowercased string for cheap
  // substring lookups. Walks sections → items → bullets + header.
  const resumeBlob = resumeContentToBlob(resumeContent).toLowerCase();

  // Tokenise JD: split on non-letter chars, drop stopwords, keep
  // longer-than-3-char terms PLUS the force-candidate set.
  const words = jd
    .toLowerCase()
    .split(/[^a-z0-9.\-+#]+/) // keep . - + # for things like "next.js", "c++"
    .filter((w) => w.length > 0);

  const counts = new Map<string, number>();
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    const len = w.length;
    const isAcronym = FORCE_CANDIDATES.has(w);
    if (!isAcronym && len < 4) continue;
    // Strip trailing punctuation that survived the split.
    const cleaned = w.replace(/^[.\-]+|[.\-]+$/g, "");
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }

  // Also surface short bigrams of capitalised phrases as candidates —
  // catches "Microsoft Teams", "Real World Evidence", etc. that
  // single-token logic misses.
  const phraseMatches = jd.match(/[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){1,2}/g) ?? [];
  for (const phrase of phraseMatches) {
    const lc = phrase.toLowerCase();
    // Skip if all-stopword-ish ("The Team", "Our Company").
    const tokens = lc.split(/\s+/);
    if (tokens.every((t) => STOPWORDS.has(t) || t.length < 3)) continue;
    counts.set(lc, (counts.get(lc) ?? 0) + 2); // weight phrases higher
  }

  // Build ranked candidate list.
  const ranked = Array.from(counts.entries())
    .sort(([a, ac], [b, bc]) => (bc - ac) || a.localeCompare(b))
    .slice(0, MAX_CANDIDATES);

  const skills: SkillMatch[] = ranked.map(([term, jdHits]) => ({
    term,
    jdHits,
    present: resumeBlob.includes(term),
  }));

  const matched = skills.filter((s) => s.present).length;
  const total = skills.length;
  const percent = total === 0 ? 0 : Math.round((matched / total) * 100);

  return { total, matched, skills, percent };
}

function resumeContentToBlob(content: ResumeContent | null | undefined): string {
  if (!content || typeof content !== "object") return "";
  const parts: string[] = [];
  if (content.header) {
    const h = content.header as Record<string, unknown>;
    for (const v of Object.values(h)) {
      if (typeof v === "string") parts.push(v);
    }
  }
  for (const section of content.sections ?? []) {
    if (section.title) parts.push(section.title);
    for (const item of section.items ?? []) {
      if (item.title) parts.push(item.title);
      if (item.subtitle) parts.push(item.subtitle);
      if (item.description) parts.push(item.description);
      if (item.metric) parts.push(item.metric);
      for (const b of item.bullets ?? []) {
        if (b.body) parts.push(b.body);
      }
    }
  }
  return parts.join(" \n ");
}
