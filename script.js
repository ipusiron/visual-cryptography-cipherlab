// i18n: 言語を決めて静的な文言を当て、言語ボタンを配線する
const M = window.VCMessages;
const I18N = window.VCI18n;
const t = (key, vars) => M.t(key, vars);
let relabel = () => {};
(function initLang(){
  const lang = I18N.initialLanguage(location.search, I18N.readSaved(), navigator.languages);
  I18N.use(lang, document);
  const btn = document.getElementById('lang-btn');
  if (btn) btn.addEventListener('click', () => {
    const next = M.getLanguage() === 'ja' ? 'en' : 'ja';
    I18N.use(next, document);
    I18N.save(next);
    relabel();
  });
})();

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

const VC = window.VCCore;
// シェアのパターンは予測不能な乱数で選ぶ（CSPRNG）。これが単独シェアの秘匿性の前提
const randomBytes = VC.cryptoBytes(window.crypto);

function loadImage(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=> { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = (e)=> { URL.revokeObjectURL(img.src); reject(e); };
    img.src = URL.createObjectURL(file);
  });
}

function toBinarized(img, thr){
  const c=document.createElement('canvas'), ctx=c.getContext('2d');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  ctx.drawImage(img,0,0);
  const im = ctx.getImageData(0,0,c.width,c.height);
  return {w:c.width, h:c.height, bin:VC.binarize(im.data, c.width, c.height, thr)};
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
      const p=VC.pickPattern(randomBytes);
      const {a,b}=VC.sharesForPixel(v,p);
      setBlock(imgA,x*2,y*2,a);
      setBlock(imgB,x*2,y*2,b);
    }
  }
  ctxA.putImageData(imgA,0,0);
  ctxB.putImageData(imgB,0,0);
}

btnGen?.addEventListener('click',async()=>{
  const file=encInput?.files?.[0];
  if(!file) return alert(t('msg.needUpload'));
  try{
    const img=await loadImage(file);
    const thr=Number.isFinite(+threshEl.value)?+threshEl.value:128;
    const {w,h,bin}=toBinarized(img,thr);
    renderShares(bin,w,h);
    setDownloadsEnabled(true);
  }catch(e){
    alert(t('msg.loadFail'));
  }
});

const dlButtons=[...document.querySelectorAll('button[data-dl]')];
function setDownloadsEnabled(on){ dlButtons.forEach(b=>{ b.disabled=!on; }); }
setDownloadsEnabled(false); // シェアを生成するまでは、空のPNGを保存できないようにする
dlButtons.forEach(btn=>{
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
  if(!fA||!fB) return alert(t('msg.needBoth'));
  try{
    const [cA,cB]=await Promise.all([loadAsCanvas(fA),loadAsCanvas(fB)]);
    const W=Math.max(cA.width,cB.width),H=Math.max(cA.height,cB.height);
    overlay.width=W;overlay.height=H;
    const ctx=overlay.getContext('2d');
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(cA,0,0);
    ctx.globalCompositeOperation='darken';
    ctx.drawImage(cB,(+offx.value||0),(+offy.value||0));
    ctx.globalCompositeOperation='source-over';
  }catch(e){
    alert(t('msg.overlayFail'));
  }
});

// --- RNG trap demo: 予測できる乱数だと片方のシェアから秘密が復元できる ---
(function(){
  const seedEl=document.getElementById('rng-seed');
  const btnGen=document.getElementById('btn-rng-gen');
  const btnAtk=document.getElementById('btn-rng-attack');
  const cvSecret=document.getElementById('rng-secret');
  const cvShareB=document.getElementById('rng-shareB');
  const cvRec=document.getElementById('rng-recovered');
  const msg=document.getElementById('rng-msg');
  if(!btnGen) return;
  let state=null; // {w,h,bin,shareB(blocks)}
  let msgKey=null;
  function setMsg(key){ msgKey=key; msg.textContent=key?t(key):''; }
  relabel=()=>{ if(msgKey) msg.textContent=t(msgKey); };

  // 秘密画像を作る（「秘密」の文字を描く）。返り値は2値（1=黒）
  function makeSecret(){
    const w=140,h=60;
    const c=document.createElement('canvas'); c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#000'; ctx.font='bold 40px sans-serif'; ctx.textBaseline='middle'; ctx.textAlign='center';
    ctx.fillText('秘密',w/2,h/2+2);
    const im=ctx.getImageData(0,0,w,h);
    return {w,h,bin:VC.binarize(im.data,w,h,128)};
  }

  // 2値を拡大して白黒で描く（1=黒）
  function drawBin(cv,bin,w,h,scale){
    cv.width=w*scale; cv.height=h*scale;
    const ctx=cv.getContext('2d');
    const im=ctx.createImageData(cv.width,cv.height);
    for(let y=0;y<cv.height;y++) for(let x=0;x<cv.width;x++){
      const v=bin[((y/scale)|0)*w+((x/scale)|0)]; const col=v?0:255; const idx=(y*cv.width+x)*4;
      im.data[idx]=col;im.data[idx+1]=col;im.data[idx+2]=col;im.data[idx+3]=255;
    }
    ctx.putImageData(im,0,0);
  }

  // シェア（2×2ブロックの配列）をcanvasに描く
  function drawBlocks(cv,blocks,w,h){
    const W=w*2,H=h*2; cv.width=W;cv.height=H;
    const ctx=cv.getContext('2d'); const im=ctx.createImageData(W,H);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const b=blocks[y*w+x];
      const put=(px,py,val)=>{const idx=(py*W+px)*4;const col=val?0:255;im.data[idx]=col;im.data[idx+1]=col;im.data[idx+2]=col;im.data[idx+3]=255;};
      put(x*2,y*2,b[0]);put(x*2+1,y*2,b[1]);put(x*2,y*2+1,b[2]);put(x*2+1,y*2+1,b[3]);
    }
    ctx.putImageData(im,0,0);
  }

  btnGen.addEventListener('click',()=>{
    const {w,h,bin}=makeSecret();
    const seed=Number.isFinite(+seedEl.value)?(+seedEl.value|0):12345;
    const idx=VC.patternIndices(w*h,VC.lcgBytes(seed));
    const shareB=[]; for(let i=0;i<w*h;i++) shareB.push(VC.sharesForPixel(bin[i],VC.PATTERNS[idx[i]]).b);
    state={w,h,bin,shareB};
    drawBin(cvSecret,bin,w,h,2);
    drawBlocks(cvShareB,shareB,w,h);
    cvRec.width=cvShareB.width;cvRec.height=cvShareB.height;cvRec.getContext('2d').clearRect(0,0,cvRec.width,cvRec.height);
    setMsg('msg.rngGenerated');
  });

  btnAtk.addEventListener('click',()=>{
    if(!state) return alert(t('msg.rngNeedGen'));
    const {w,h,shareB,bin}=state;
    const seed=Number.isFinite(+seedEl.value)?(+seedEl.value|0):12345;
    // 攻撃者はシードから乱数列を再現し、シェアBと照合して秘密を復元する
    const idx=VC.patternIndices(w*h,VC.lcgBytes(seed));
    const recovered=VC.recoverFromShareB(shareB,idx);
    if(!recovered){ setMsg('msg.rngWrongSeed'); return; }
    drawBin(cvRec,recovered,w,h,2);
    const match=recovered.every((v,i)=>v===bin[i]);
    setMsg(match ? 'msg.rngRecovered' : 'msg.rngPartial');
  });
})();

// --- Accordion functionality ---
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const isActive = header.classList.contains('active');

    // Close all other accordions
    document.querySelectorAll('.accordion-header').forEach(otherHeader => {
      if (otherHeader !== header) {
        otherHeader.classList.remove('active');
        otherHeader.setAttribute('aria-expanded', 'false');
        otherHeader.nextElementSibling.classList.remove('active');
      }
    });

    // Toggle current accordion
    const next = !isActive;
    header.classList.toggle('active', next);
    header.setAttribute('aria-expanded', String(next));
    content.classList.toggle('active', next);
  });
});
