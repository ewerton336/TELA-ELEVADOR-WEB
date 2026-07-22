import { chromium } from '@playwright/test';
import fs from 'fs'; import { execFileSync } from 'child_process'; import path from 'path';
const FPS=18, SIZE=128, DIR='public/weather', TMP=path.join(process.env.TMPDIR||'/tmp','gifframes');
function gcd(a,b){return b?gcd(b,a%b):a;} function lcm(a,b){return a*b/gcd(a,b);}
function period(svg){const d=[...svg.matchAll(/dur="([0-9.]+)s"/g)].map(m=>Math.round(parseFloat(m[1])*100));if(!d.length)return 3;let l=d[0];for(const x of d)l=lcm(l,x);let s=l/100;while(s>6)s/=2;while(s<2)s*=2;return Math.min(6,Math.max(2,Math.round(s)));}
const files=fs.readdirSync(DIR).filter(f=>f.endsWith('.svg'));
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:SIZE,height:SIZE},deviceScaleFactor:1})).newPage();
for(const f of files){
  const name=f.replace('.svg',''); const svg=fs.readFileSync(path.join(DIR,f),'utf8');
  const sec=period(svg), frames=sec*FPS;
  await p.setContent(`<body style="margin:0;background:transparent">${svg.replace(/<svg\b/i,`<svg width="${SIZE}" height="${SIZE}"`)}</body>`);
  const el=await p.$('svg'); await p.evaluate(()=>{const s=document.querySelector('svg');s&&s.pauseAnimations&&s.pauseAnimations();});
  const fd=path.join(TMP,name); fs.rmSync(fd,{recursive:true,force:true}); fs.mkdirSync(fd,{recursive:true});
  for(let i=0;i<frames;i++){ await p.evaluate(t=>{const s=document.querySelector('svg');s&&s.setCurrentTime(t);}, i/FPS); await el.screenshot({path:path.join(fd,`f${String(i).padStart(3,'0')}.png`),omitBackground:true}); }
  execFileSync('/usr/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(FPS),'-i',path.join(fd,'f%03d.png'),
   '-filter_complex','split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=diff[p];[b][p]paletteuse=alpha_threshold=128:dither=bayer:bayer_scale=3',
   path.join(DIR,`${name}.gif`)]);
  fs.rmSync(fd,{recursive:true,force:true});
  console.log(`${name}.gif: ${Math.round(fs.statSync(path.join(DIR,name+'.gif')).size/1024)}KB`);
}
await b.close(); console.log('OK 22 GIFs');
