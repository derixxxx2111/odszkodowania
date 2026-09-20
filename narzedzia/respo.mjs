import { spawn } from 'node:child_process'; import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new','--remote-debugging-port=9338','--user-data-dir='+mkdtempSync(join(tmpdir(),'r-')),'--no-first-run','about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms)); await sleep(2500);
const t = (await (await fetch('http://127.0.0.1:9338/json')).json()).find(t => t.type==='page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id=0; const p={}; ws.onmessage = m => { const d=JSON.parse(m.data); if(p[d.id]){p[d.id](d);delete p[d.id];} };
const cmd=(m,params={})=>new Promise(r=>{p[++id]=r;ws.send(JSON.stringify({id,method:m,params}))});

const URLE = { 'glowna':'file:///C:/Dev/strona-odszkodowania/index.html', 'dalej':'file:///C:/Dev/strona-odszkodowania/dalej.html' };
const EKRANY = [[320,568,'maly telefon'],[390,844,'iPhone'],[768,1024,'iPad pion'],[1024,1366,'iPad poziom'],[1440,900,'komputer']];

for (const [nazwa, url] of Object.entries(URLE)) {
  console.log('\n=== ' + nazwa.toUpperCase() + ' ===');
  for (const [w, h, opis] of EKRANY) {
    await cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<768});
    await cmd('Page.navigate',{url}); await sleep(1400);
    const r = (await cmd('Runtime.evaluate',{returnByValue:true,expression:`(() => {
      const d = document.documentElement;
      const wystajace = [...document.querySelectorAll('body *')]
        .filter(el => { const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > d.clientWidth + 1 || b.left < -1); })
        .map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      const male = [...document.querySelectorAll('a,button,input,summary')]
        .filter(el => { const b = el.getBoundingClientRect(); return b.height > 0 && b.height < 40; }).length;
      return JSON.stringify({ scroll: d.scrollWidth, klient: d.clientWidth,
        wystajace: [...new Set(wystajace)].slice(0,4), male });
    })()`})).result.result.value;
    const o = JSON.parse(r);
    const poziomy = o.scroll > o.klient + 1;
    console.log(`  ${String(w).padStart(4)}px ${opis.padEnd(12)} | poziome przewijanie: ${poziomy ? 'TAK ' + o.scroll + '>' + o.klient : 'nie'} | wystajace: ${o.wystajace.length ? o.wystajace.join(', ') : 'brak'} | klikalne <40px: ${o.male}`);
  }
}
edge.kill(); process.exit(0);
