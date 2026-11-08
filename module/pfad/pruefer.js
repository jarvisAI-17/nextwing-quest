// ===== Prüfer Pfadrätsel: zählt Wege, die jedes freie Feld genau einmal besuchen (Start → Ziel) =====
function countPaths(W,H,blocked,start,goal,cap,stepCap){
  const N=W*H,free=new Uint8Array(N);let nFree=0;for(let i=0;i<N;i++){if(!blocked.has(i)){free[i]=1;nFree++;}}
  const nb=[];for(let i=0;i<N;i++){const x=i%W,y=(i/W)|0,a=[];if(x>0)a.push(i-1);if(x<W-1)a.push(i+1);if(y>0)a.push(i-W);if(y<H-1)a.push(i+W);nb.push(a.filter(j=>free[j]));}
  const vis=new Uint8Array(N),path=[start];vis[start]=1;let found=0,steps=0,first=null,aborted=false;
  const stack=new Int32Array(N);
  function ok(head,len){ // Pruning: jedes offene Feld braucht Ein- und Ausgang, Rest muss zusammenhängen
    for(let i=0;i<N;i++){if(!free[i]||vis[i])continue;let d=0;for(const j of nb[i])if(!vis[j]||j===head)d++;if(i===goal){if(d<1)return false;}else if(d<2)return false;}
    if(vis[goal])return false;
    let s=-1;for(const j of nb[head])if(!vis[j]){s=j;break;}if(s<0)return false;
    const seen=new Uint8Array(N);let sp=0,c=0;stack[sp++]=s;seen[s]=1;while(sp){const k=stack[--sp];c++;for(const j of nb[k])if(!vis[j]&&!seen[j]){seen[j]=1;stack[sp++]=j;}}
    return c===nFree-len;}
  function dfs(head,len){
    if(found>=cap||aborted)return;if(++steps>stepCap){aborted=true;return;}
    if(len===nFree){if(head===goal){found++;if(!first)first=path.slice();}return;}
    if(head===goal)return;
    for(const j of nb[head]){if(vis[j])continue;vis[j]=1;path.push(j);
      if(len+1===nFree||ok(j,len+1))dfs(j,len+1);
      path.pop();vis[j]=0;if(found>=cap||aborted)return;}
  }
  dfs(start,1);
  // Entscheidungspunkte: an wie vielen Stellen des Lösungswegs sieht mehr als ein Schritt plausibel aus
  let decisions=0;if(first){vis.fill(0);vis[start]=1;for(let s=0;s<first.length-1;s++){const h=first[s];let opts=0;for(const j of nb[h]){if(vis[j])continue;vis[j]=1;const len=s+2;if(len===nFree?j===goal:(j!==goal&&ok(j,len)))opts++;vis[j]=0;}if(opts>1)decisions++;vis[first[s+1]]=1;}}
  return{found,steps,first,aborted,nFree,decisions};
}
const PDIFF={leicht:{W:4,H:4,obs:[1,2],marks:2,minDec:1,label:'leicht'},mittel:{W:5,H:5,obs:[2,4],marks:0,minDec:3,label:'mittel'},schwer:{W:6,H:6,obs:[2,5],marks:0,minDec:6,label:'schwer'}};
function rnd(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function generate(diff,seed,onTry){
  const R=PDIFF[diff],r=rnd(seed),W=R.W,H=R.H,N=W*H,start=(H-1)*W;const log=[];
  for(let a=1;a<=1500;a++){
    const k=R.obs[0]+Math.floor(r()*(R.obs[1]-R.obs[0]+1));const bl=new Set();
    while(bl.size<k){const c=Math.floor(r()*N);if(c!==start&&c!==W-1)bl.add(c);}
    // Paritätsbedingung im Schachbrett: Ziel muss zur Feldanzahl passen
    const nFree=N-k,col=i=>((i%W)+((i/W)|0))%2,sc=col(start);
    const cands=[];for(let i=0;i<N;i++){if(bl.has(i)||i===start)continue;const need=(nFree%2===1)?sc:1-sc;if(col(i)===need)cands.push(i);}
    // Ziel bevorzugt weit weg (oben rechts)
    cands.sort((p,q)=>((q%W)-((q/W)|0))-((p%W)-((p/W)|0))+ (r()-.5)*3);
    for(const goal of cands.slice(0,5)){
      const res=countPaths(W,H,bl,start,goal,2,250000);
      const e={a,obs:k,goal,found:res.found,steps:res.steps,aborted:res.aborted,decisions:res.decisions};log.push(e);onTry&&onTry(e);
      if(res.found===1&&!res.aborted&&res.decisions>=R.minDec){
        const marks=[];if(R.marks){const sol=res.first;for(let m=1;m<=R.marks;m++)marks.push(sol[Math.round(m*sol.length/(R.marks+1))]);}
        return{W,H,blocked:[...bl],start,goal,solution:res.first,marks,log,steps:res.steps,decisions:res.decisions};}
    }
  }
  return null;
}
