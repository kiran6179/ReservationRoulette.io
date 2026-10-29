'use strict';
/* ===== MODEL: seeded Monte Carlo of one night of reservations ===== */
const Sim=(()=>{
 const ROOMS=100,NS_G=.04,WI_P=.35,CAP=ROOMS+30;
 function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 /** Simulate n nights at overbooking level `over`; same seed => same random numbers (smooth curves). */
 function run(p,over,seed,n){
  const r=rng(seed),hist=new Array(CAP).fill(0);let net=0,rev=0,walk=0,pw=0,sold=0,ret=0;
  for(let t=0;t<n;t++){
   let arr=0,nsg=0;
   for(let i=0;i<ROOMS+over;i++){const g=r()<p.g;if(r()<(g?NS_G:p.nsN)){if(g)nsg++}else arr++}
   let wi=0;for(let j=0;j<8;j++)if(r()<WI_P)wi++;
   const seated=Math.min(arr,ROOMS),walked=Math.max(0,arr-ROOMS),s=seated+Math.min(wi,ROOMS-seated);
   rev+=s*p.adr;ret+=nsg*p.adr;walk+=walked;sold+=s;if(walked)pw++;
   net+=s*p.adr+nsg*p.adr-walked*p.comp;hist[Math.min(arr,CAP-1)]++;
  }
  return{net:net/n,rev:rev/n,walk:walk/n,pw:pw/n,occ:sold/n/ROOMS*100,revpar:rev/n/ROOMS,ret:ret/n,hist,n};
 }
 function curve(p,seed){const a=[];for(let o=0;o<=25;o++)a.push(run(p,o,seed,500).net);return a}
 return{ROOMS,run,curve};
})();
/* ===== HELPERS ===== */
const $=s=>document.querySelector(s),inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
let seed=11,last=null,curveData=null;
const params=()=>({g:+$('#gs').value/100,adr:+$('#adr').value,comp:+$('#comp').value,nsN:+$('#nsn').value/100});
/* ===== CHARTS (Canvas 2D) ===== */
const Chart={
 fit(c){const d=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return[x,w,h]},
 hist(c,res){const[x,W,H]=this.fit(c),lo=70,hi=125,m={l:36,r:10,t:12,b:30},mx=Math.max(...res.hist.slice(lo,hi+1),1),bw=(W-m.l-m.r)/(hi-lo+1);
  x.font='11px system-ui';x.fillStyle='#5d6585';x.strokeStyle='#e2defa';
  for(let i=0;i<=4;i++){const y=H-m.b-(H-m.t-m.b)*i/4;x.beginPath();x.moveTo(m.l,y);x.lineTo(W-m.r,y);x.stroke();x.fillText(Math.round(mx*i/4/res.n*100)+'%',2,y+4)}
  for(let a=lo;a<=hi;a++){const v=res.hist[a],h=(H-m.t-m.b)*v/mx,px=m.l+(a-lo)*bw;x.fillStyle=a>SIM_R?'#e11d48':'#0ea5a4';x.fillRect(px+1,H-m.b-h,bw-2,h)}
  const cx=m.l+(SIM_R+1-lo)*bw;x.strokeStyle='#1f2540';x.setLineDash([5,4]);x.beginPath();x.moveTo(cx,m.t);x.lineTo(cx,H-m.b);x.stroke();x.setLineDash([]);
  x.fillStyle='#1f2540';x.fillText('Capacity 100',cx+4,m.t+10);
  for(let a=lo;a<=hi;a+=5)x.fillText(a,m.l+(a-lo)*bw,H-12);x.fillText('Guests arriving with reservations',W/2-70,H-1)},
 curve(c,arr,cur,best){const[x,W,H]=this.fit(c),m={l:58,r:12,t:14,b:30},mn=Math.min(...arr),mx=Math.max(...arr),sp=(mx-mn)||1,X=i=>m.l+(W-m.l-m.r)*i/25,Y=v=>H-m.b-(H-m.t-m.b)*(v-mn)/sp;
  x.font='11px system-ui';x.fillStyle='#5d6585';x.strokeStyle='#e2defa';
  for(let i=0;i<=4;i++){const v=mn+sp*i/4,y=Y(v);x.beginPath();x.moveTo(m.l,y);x.lineTo(W-m.r,y);x.stroke();x.fillText(inr(v/1000)+'k',2,y+4)}
  x.strokeStyle='#6d28d9';x.lineWidth=2.5;x.beginPath();arr.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));x.stroke();x.lineWidth=1;
  for(let i=0;i<=25;i+=5)x.fillText(i,X(i)-4,H-14);x.fillText('Extra rooms sold (overbooking)',W/2-80,H-1);
  x.fillStyle='#f97316';x.beginPath();x.arc(X(cur),Y(arr[cur]),7,0,7);x.fill();
  x.fillStyle='#16a34a';x.font='20px system-ui';x.fillText('★',X(best)-9,Y(arr[best])-8)}
};
const SIM_R=Sim.ROOMS;
/* ===== MAIN UPDATE ===== */
function update(){
 const p=params(),o=+$('#over').value;
 $('#vo').textContent=o;$('#vg').textContent=Math.round(p.g*100);$('#va').textContent=inr(p.adr);$('#vc').textContent=inr(p.comp);$('#vn').textContent=Math.round(p.nsN*100);
 last=Sim.run(p,o,seed,1500);curveData=Sim.curve(p,seed);
 const best=curveData.indexOf(Math.max(...curveData));last.best=best;
 $('#kpis').innerHTML=[['k1','Occupancy',last.occ.toFixed(1)+'%'],['k5','RevPAR',inr(last.revpar)],['k2','Net contribution',inr(last.net)],['k4','Nights with a walked guest',(last.pw*100).toFixed(0)+'%'],['k3','Avg guests walked',last.walk.toFixed(2)]].map(k=>`<div class="k ${k[0]}"><small>${k[1]}</small><b>${k[2]}</b></div>`).join('');
 Chart.hist($('#c1'),last);Chart.curve($('#c2'),curveData,o,best);
 const pr=$('#pred').value;
 $('#predmsg').innerHTML=pr===''?'You have not made a prediction yet. Go back to step 2 first.':(()=>{const q=Sim.run(p,+pr,seed,1500),rk=q.pw<.25?'l':q.pw<.6?'m':'h',ok=rk===$('#risk').value;return `Your prediction: <b>${pr}</b> extra rooms. With the current settings the best level is <b>${best}</b>; at your level the walk risk is <b>${(q.pw*100).toFixed(0)}%</b> of nights (${ok?'your risk estimate was right':'your risk estimate was off'}). Net gap vs best: <b>${inr(curveData[best]-curveData[+pr])}</b>. Change the sliders: does the best level move?`})();
}
/* ===== NOTEBOOK ===== */
const NB={rows:[],add(){if(!last)return;const p=params();this.rows.push({o:+$('#over').value,g:Math.round(p.g*100),a:p.adr,c:p.comp,n:Math.round(p.nsN*100),pw:Math.round(last.pw*100),net:last.net,best:last.best,note:$('#note').value});$('#note').value='';this.draw();store()},
 del(i){this.rows.splice(i,1);this.draw();store()},
 draw(){$('#nbt').innerHTML='<tr><th>#</th><th>Extra</th><th>Guar.%</th><th>ADR</th><th>Walk cost</th><th>NS%</th><th>Walk risk</th><th>Net</th><th>Best</th><th>Note</th><th></th></tr>'+this.rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.o}</td><td>${r.g}</td><td>${inr(r.a)}</td><td>${inr(r.c)}</td><td>${r.n}</td><td>${r.pw}%</td><td>${inr(r.net)}</td><td>${r.best}</td><td>${esc(r.note)}</td><td><button class="btn x" onclick="NB.del(${i})">✕</button></td></tr>`).join('')},
 exportTxt(){let t='RESERVATION ROULETTE: STUDENT NOTEBOOK\nIHM Shri Shakti · Created by Dr. Kiran Mayi Audina\n\n';document.querySelectorAll('[data-k]').forEach(e=>{if(e.value)t+=`${e.dataset.k}: ${e.value}\n`});t+='\nOBSERVATIONS\n'+this.rows.map((r,i)=>`${i+1}. extra=${r.o}, guaranteed=${r.g}%, ADR=${r.a}, walkcost=${r.c}, noshow=${r.n}%, walkrisk=${r.pw}%, net=${Math.round(r.net)}, best=${r.best} | ${r.note}`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download='reservation-roulette-notebook.txt';a.click()}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ===== COMPARE ===== */
const CMP={A:null,B:null,save(k){if(!last)update();const p=params();this[k]={o:+$('#over').value,g:p.g*100,a:p.adr,c:p.comp,n:p.nsN*100,pw:last.pw*100,net:last.net,rp:last.revpar,occ:last.occ,best:last.best};this.draw();store()},
 draw(){const A=this.A,B=this.B,rows=[['Extra rooms','o',v=>v],['Guaranteed %','g',v=>v.toFixed(0)],['ADR','a',inr],['Walk cost','c',inr],['No-show % (non-guar.)','n',v=>v.toFixed(0)],['Walk risk','pw',v=>v.toFixed(0)+'%',-1],['Occupancy','occ',v=>v.toFixed(1)+'%'],['RevPAR','rp',inr,1],['Net contribution','net',inr,1],['Best overbooking level','best',v=>v]];
  $('#cmp').innerHTML='<tr><th></th><th>Scenario A</th><th>Scenario B</th></tr>'+rows.map(r=>{const a=A?r[2](A[r[1]]):'–',b=B?r[2](B[r[1]]):'–',w=A&&B&&r[3]?((B[r[1]]-A[r[1]])*r[3]>0?'B':(B[r[1]]-A[r[1]])*r[3]<0?'A':''):'';return `<tr><td>${r[0]}</td><td class="${w==='A'?'good':''}">${a}</td><td class="${w==='B'?'good':''}">${b}</td></tr>`}).join('')}};
/* ===== RECOMMENDATION CHECK (keyword rubric, formative only) ===== */
const REC={check(){const t=$('#just').value.toLowerCase(),R=[['Uses evidence (numbers from notebook)',/\d/.test(t)],['Mentions guaranteed vs non-guaranteed',/guarant/.test(t)],['Mentions no-shows / retention',/no-?show|retain|retention|deposit/.test(t)],['Mentions walking cost or reputation',/walk|compensat|reputation|relocat/.test(t)],['Compares options or scenarios',/compar|whereas|however|than|versus|vs/.test(t)],['Acknowledges a limitation',/limit|assum|real|risk/.test(t)]];
  $('#chk').innerHTML='<div class="msg">'+R.map(r=>`<div class="${r[1]?'tick':'cross'}">${r[1]?'✔':'○'} ${r[0]}</div>`).join('')+'<p class="ref">Formative checklist only; your teacher reads the reasoning.</p></div>'}};
/* ===== PERSISTENCE (localStorage, optional) ===== */
function store(){try{const d={};document.querySelectorAll('[data-k]').forEach(e=>d[e.dataset.k]=e.value);d._nb=NB.rows;d._A=CMP.A;d._B=CMP.B;localStorage.setItem('rr_pbl',JSON.stringify(d))}catch(e){}}
function restore(){try{const d=JSON.parse(localStorage.getItem('rr_pbl')||'{}');document.querySelectorAll('[data-k]').forEach(e=>{if(d[e.dataset.k]!=null)e.value=d[e.dataset.k]});NB.rows=d._nb||[];CMP.A=d._A||null;CMP.B=d._B||null}catch(e){}}
/* ===== NAVIGATION ===== */
const UI={names:['Problem','Predict','Investigate','Compare','Recommend','Reflect','Solutions'],cur:0,seen:new Set(),
 go(i){this.cur=i;this.seen.add(i);document.querySelectorAll('.sec').forEach((s,k)=>s.classList.toggle('on',k===i));this.nav();scrollTo(0,0);if(i===2)requestAnimationFrame(update)},
 nav(){$('#nav').innerHTML='';this.names.forEach((n,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' '+n;b.className=(i===this.cur?'on ':'')+(this.seen.has(i)?'done':'');b.onclick=()=>this.go(i);$('#nav').append(b)})},
 reseed(){seed=Math.floor(Math.random()*1e6);update()}};
['over','gs','adr','comp','nsn'].forEach(id=>$('#'+id).addEventListener('input',update));
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.k)store()});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.k)store()});
addEventListener('resize',()=>{if(UI.cur===2&&last){Chart.hist($('#c1'),last);Chart.curve($('#c2'),curveData,+$('#over').value,last.best)}});
restore();NB.draw();CMP.draw();UI.go(0);
