// Tab switching
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('section.tab').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- Encrypt: image -> 2 shares (2x2 expansion) ---
const encInput = document.getElementById('enc-input');
const threshEl = document.getElementById('thresh');
const btnGen = document.getElementById('btn-generate');
const shareA = document.getElementById('shareA');
const shareB = document.getElementById('shareB');

const PATTERNS = [
  [1,1,0,0],[1,0,1,0],[1,0,0,1],
  [0,1,1,0],[0,1,0,1],[0,0,1,1]
];

function loadImage(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function toBinarized(img, thr=128){
  const c=document.createElement('canvas'), ctx=c.getContext('2d');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  ctx.drawImage(img,0,0);
  const im = ctx.getImageData(0,0,c.width,c.height);
  const out = new Uint8ClampedArray(c.width*c.height);
  for(let i=0;i<im.data.length;i+=4){
    const y = 0.299*im.data[i] + 0.587*im.data[i+1] + 0.114*im.data[i+2];
    out[i/4] = (y >= thr ? 0 : 1);
  }
  return {w:c.width,h:c.height,bin:out};
}

function renderShares(bin,w,h){
  const W=w*2,H=h*2;
  shareA.width=W; shareA.height=H;
  shareB.width=W; shareB.height=H;
  const ctxA=shareA.getContext('2d'), ctxB=shareB.getContext('2d');
  const imgA=ctxA.createImageData(W,H), imgB=ctxB.createImageData(W,H);

  function setBlock(imgData,x,y,block){
    const put=(px,py,val)=>{
      const idx=((py*W)+px)*4;
      const c=val?0:255;
      imgData.data[idx]=c; imgData.data[idx+1]=c; imgData.data[idx+2]=c; imgData.data[idx+3]=255;
    };
    put(x,y,block[0]); put(x+1,y,block[1]); put(x,y+1,block[2]); put(x+1,y+1,block[3]);
  }

  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const v=bin[y*w+x];
      const p=PATTERNS[(Math.random()*PATTERNS.length)|0];
      const inv=p.map(b=> b?0:1);
      if(v===0){
        setBlock(imgA,x*2,y*2,p);
        setBlock(imgB,x*2,y*2,p);
      }else{
        setBlock(imgA,x*2,y*2,p);
        setBlock(imgB,x*2,y*2,inv);
      }
    }
  }
  ctxA.putImageData(imgA,0,0);
  ctxB.putImageData(imgB,0,0);
}

btnGen?.addEventListener('click',async()=>{
  const file=encInput?.files?.[0];
  if(!file) return alert('まず画像をアップロードしてください。');
  const img=await loadImage(file);
  const {w,h,bin}=toBinarized(img,+threshEl.value||128);
  renderShares(bin,w,h);
});

document.querySelectorAll('button[data-dl]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const id=btn.getAttribute('data-dl');
    const cv=document.getElementById(id);
    const a=document.createElement('a');
    a.href=cv.toDataURL('image/png');
    a.download=id+'.png';
    a.click();
  });
});

// --- Decode: overlay two shares ---
const decA=document.getElementById('dec-a');
const decB=document.getElementById('dec-b');
const btnOverlay=document.getElementById('btn-overlay');
const overlay=document.getElementById('overlay');
const offx=document.getElementById('offx');
const offy=document.getElementById('offy');

function loadAsCanvas(file){
  return new Promise((resolve,reject)=>{
    loadImage(file).then(img=>{
      const c=document.createElement('canvas'), ctx=c.getContext('2d');
      c.width=img.naturalWidth;c.height=img.naturalHeight;
      ctx.drawImage(img,0,0);resolve(c);
    }).catch(reject);
  });
}

btnOverlay?.addEventListener('click',async()=>{
  const fA=decA?.files?.[0],fB=decB?.files?.[0];
  if(!fA||!fB) return alert('両方のシェアを読み込んでください。');
  const [cA,cB]=await Promise.all([loadAsCanvas(fA),loadAsCanvas(fB)]);
  const W=Math.max(cA.width,cB.width),H=Math.max(cA.height,cB.height);
  overlay.width=W;overlay.height=H;
  const ctx=overlay.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.drawImage(cA,0,0);
  ctx.globalCompositeOperation='darken';
  ctx.drawImage(cB,(+offx.value||0),(+offy.value||0));
  ctx.globalCompositeOperation='source-over';
});

// --- Accordion functionality ---
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');

    // Close all other accordions
    document.querySelectorAll('.accordion-header').forEach(otherHeader => {
      if (otherHeader !== header) {
        otherHeader.classList.remove('active');
        otherHeader.nextElementSibling.classList.remove('active');
      }
    });

    // Toggle current accordion
    if (isActive) {
      header.classList.remove('active');
      content.classList.remove('active');
    } else {
      header.classList.add('active');
      content.classList.add('active');
    }
  });
});
