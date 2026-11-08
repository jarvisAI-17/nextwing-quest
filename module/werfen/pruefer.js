// ===== Prüfer (identisch in Generator und Spiel) =====
const PHYS={W:800,H:450,G:900,VMAX:900,LX:110,LY:345,SHELF_Y:300,CW:28,CH:38,GROUND:372};
function layoutCans(p){
  const w=PHYS.CW*p.size,h=PHYS.CH*p.size,gap=3*p.size,cx=480+p.distance*190,cans=[];
  const rows=p.layout==='reihe'?[5]:p.layout==='turm'?[2,2,2]:[3,2,1];
  rows.forEach((n,ri)=>{const tot=n*w+(n-1)*gap,x0=cx-tot/2;
    for(let i=0;i<n;i++)cans.push({row:ri,x:x0+i*(w+gap)+w/2,y:PHYS.SHELF_Y-h/2-ri*h,w,h});});
  cans.forEach(c=>{c.sup=[];if(c.row>0)cans.forEach((d,j)=>{if(d.row===c.row-1&&Math.abs(d.x-c.x)<w)c.sup.push(j);});});
  return cans;
}
function shelfOf(cans){let a=1e9,b=-1e9;cans.forEach(c=>{a=Math.min(a,c.x-c.w/2);b=Math.max(b,c.x+c.w/2);});return{x0:a-26,x1:b+26,y:PHYS.SHELF_Y};}
function circRect(px,py,r,c){const nx=Math.max(c.x-c.w/2,Math.min(px,c.x+c.w/2)),ny=Math.max(c.y-c.h/2,Math.min(py,c.y+c.h/2));const dx=px-nx,dy=py-ny;return dx*dx+dy*dy<r*r;}
function analyse(p){
  const cans=layoutCans(p),sh=shelfOf(cans),r=9*p.size,g=PHYS.G*p.grav,wa=p.wind*220;
  let total=0,hits=0;const rows=Math.max(...cans.map(c=>c.row))+1,rowHit=new Array(rows).fill(false);
  for(let a=10;a<=75;a+=1.5)for(let k=0;k<=32;k++){const pw=0.35+k*0.02;
    total++;const an=a*Math.PI/180;let x=PHYS.LX,y=PHYS.LY,vx=Math.cos(an)*pw*PHYS.VMAX,vy=-Math.sin(an)*pw*PHYS.VMAX;const dt=1/90;
    for(let s=0;s<450;s++){vx+=wa*dt;vy+=g*dt;x+=vx*dt;y+=vy*dt;
      if(y>PHYS.GROUND||x>sh.x1+30||x<-40)break;
      let hit=-1;for(let i=0;i<cans.length;i++)if(circRect(x,y,r,cans[i])){hit=i;break;}
      if(hit>=0){hits++;rowHit[cans[hit].row]=true;break;}
      if(y+r>sh.y&&y<sh.y+14&&x>sh.x0&&x<sh.x1)break;}}
  return{window:hits/total*100,rowHit};
}
const DIFF={leicht:{min:16,max:100,throws:6,preview:0.75,label:'leicht'},mittel:{min:10.5,max:16,throws:5,preview:0.32,label:'mittel'},schwer:{min:5,max:10.5,throws:4,preview:0,label:'schwer'}};
function tune(p0,diff){
  const p={...p0},R=DIFF[diff],log=[];p.throws=R.throws;p.preview=R.preview;
  for(let i=1;i<=12;i++){
    const a=analyse(p),w=a.window;
    if(w>=R.min&&w<=R.max){log.push({i,w,msg:'passt zu „'+R.label+'“'});return{p,log,a,ok:true};}
    if(w<R.min){p.wind=+(p.wind>=0?p.wind*0.5:p.wind*0.5).toFixed(2);p.size=+Math.min(1.35,p.size*1.1).toFixed(2);p.distance=+Math.max(0,p.distance-0.15).toFixed(2);
      log.push({i,w,msg:'zu schwer: weniger Gegenwind, größere Ziele, näher dran'});}
    else{p.wind=+Math.max(-1,(p.wind>0?-0.3:p.wind-0.25)).toFixed(2);p.size=+Math.max(0.7,p.size*0.9).toFixed(2);p.distance=+Math.min(1,p.distance+0.15).toFixed(2);
      log.push({i,w,msg:'zu leicht: Gegenwind, kleinere Ziele, weiter weg'});}
  }
  const a=analyse(p);log.push({i:13,w:a.window,msg:'Grenze erreicht, nächstliegende Stufe genommen'});return{p,log,a,ok:false};
}
