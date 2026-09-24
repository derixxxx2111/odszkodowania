// Czy zmiana naprawdę wyszła na żywo? Dowód z drugiej strony, nie „push przeszedł".
//   1. czeka, aż GitHub Pages zbuduje DOKŁADNIE lokalny HEAD (gh api .../pages/builds/latest)
//   2. pobiera żywą stronę z domeny (z ?v=, żeby ominąć cache) i szuka podanych tekstów
// Uzycie: node narzedzia/czy-na-zywo.mjs [--strona dalej.html] "tekst który ma być" ["-tekst którego ma NIE być"]
// Exit 0 = wszystko się zgadza, 1 = nie.
import { execSync } from 'node:child_process';

const DOMENA = 'https://gdzielezatwojepieniadze.pl/';
const REPO = 'derixxxx2111/odszkodowania';
const a = process.argv.slice(2);
const si = a.indexOf('--strona');
const strona = si >= 0 ? a.splice(si, 2)[1] : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
let build;
for (let i = 0; i < 40; i++) {
  build = JSON.parse(execSync(`gh api repos/${REPO}/pages/builds/latest`, { encoding: 'utf8' }));
  if (build.commit === head && build.status === 'built') break;
  if (build.commit === head && build.status === 'errored') { console.log(`❌ Pages: budowa ${head.slice(0, 7)} padła`); process.exit(1); }
  await sleep(6000);
}
if (build.commit !== head || build.status !== 'built') {
  console.log(`❌ Pages po 4 min dalej nie ma ${head.slice(0, 7)} (jest ${build.commit.slice(0, 7)} ${build.status})`);
  process.exit(1);
}
console.log(`✅ Pages zbudował ${head.slice(0, 7)}`);

let html = '';
for (let i = 0; i < 6; i++) {           // CDN GitHuba potrafi oddać starą wersję przez ~minutę
  html = await (await fetch(`${DOMENA}${strona}?v=${Date.now()}`, { cache: 'no-store' })).text();
  if (a.every((t) => (t.startsWith('-') ? !html.includes(t.slice(1)) : html.includes(t)))) break;
  await sleep(10000);
}
let ok = true;
for (const t of a) {
  const nie = t.startsWith('-'), s = nie ? t.slice(1) : t;
  const jest = html.includes(s);
  const dobrze = nie ? !jest : jest;
  ok &&= dobrze;
  console.log(`${dobrze ? '✅' : '❌'} ${nie ? 'NIE ma' : 'jest'}: „${s}” na ${DOMENA}${strona}`);
}
process.exit(ok ? 0 : 1);
