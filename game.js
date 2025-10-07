(() => {
  // Telegram Mini App friendliness
  try { const tg = window.Telegram && window.Telegram.WebApp; if (tg) { tg.ready(); tg.expand(); } } catch(e){}

  // DOM refs
  const canvas = document.getElementById('game');
  const ctx     = canvas.getContext('2d', { alpha:true, desynchronized:true });
  const scoreEl = document.getElementById('score');
  const timerEl = document.getElementById('timer');
  const overlay = document.getElementById('overlay');
  const startBtn= document.getElementById('startBtn');
  const toast   = document.getElementById('toast');
  const banner  = document.getElementById('banner');
  const sideText = document.querySelector('.side');

  // Sizing - оптимизировано для мобильных
  let W=0, H=0, DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio||1));
  function resize(){
    W = canvas.clientWidth = canvas.parentElement.clientWidth;
    H = canvas.clientHeight = canvas.parentElement.clientHeight;
    
    // Минимальные размеры для мобильных
    const minWidth = 320;
    const minHeight = 480;
    W = Math.max(W, minWidth);
    H = Math.max(H, minHeight);
    
    canvas.width  = Math.max(1,(W*DPR)|0);
    canvas.height = Math.max(1,(H*DPR)|0);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  // Grid - только рабочие дни (без выходных)
  const COLS=5, ROWS=10; const START_H=8; // Только Пн-Пт
  const PAD=15, HEADER_H=50, HOURS_W=0; // Увеличили заголовок еще больше
  const GW = () => (W - PAD*2) / COLS; // Растягиваем на весь экран
  const GH = () => (H - PAD*2 - HEADER_H - 40) / ROWS; // Добавили больше отступа между заголовком и календарем
  const ORGX = () => PAD;
  const ORGY = () => PAD + HEADER_H + 40; // Добавили 40px отступа после заголовка

  // Content
  const COLORS=[ '#aecbfa','#f28b82','#fbbc04','#ccff90','#d7aefb','#fdcfe8','#c8f7f5' ];
  const NAMES=[ 'Синк','Переговоры','Дейлик','Ретро','Плачь в туалете','Восхваление корпорации','Стратегия','Обсудить обсуждение','Фокус‑тайм?','Бухгалтер','Статус','Демо','1:1','Юрист-хуист' ];
  const DAYS = [ 'Пн','Вт','Ср','Чт','Пт' ]; // Только рабочие дни

  // State
  const S = {
    running:false,
    score:0,
    items:[],
    parts:[],
    swipePts:[],
    swipeTTL:180,
    lastSpawn:0,
    spawnEvery:1000, // 1s
    startTS:0,
    roundMs:30000,   // 30s
    occupied:new Set(),
    // banner flags
    b5:false,b10:false,b15:false,b23:false
  };

  // UI helpers
  function setScore(v){ S.score=v; scoreEl.textContent = 'Уничтожено встреч: '+S.score }
  function fmtTime(ms){ const s=Math.max(0, Math.ceil(ms/1000)); const m=(s/60)|0; const r=s%60; return `${m}:${r.toString().padStart(2,'0')}` }
  function setTimer(ms){ timerEl.textContent = fmtTime(ms) }
  function showToast(text){ /* Убрали показ уведомлений */ }
  function showBanner(text){
    // replace previous immediately
    banner.textContent = text;
    banner.classList.add('show');
    if (showBanner._t) clearTimeout(showBanner._t);
    // Уменьшили время показа баннера для мобильных
    showBanner._t = setTimeout(()=>{ banner.classList.remove('show'); banner.textContent=''; }, 3000);
  }

  // Helpers
  function cellRect(c,r){ return { x: ORGX()+c*GW(), y: ORGY()+r*GH(), w: GW(), h: GH() }; }
  function gridRectInset(c,r,px=2,py=2){ const g = cellRect(c,r); return { x:g.x+px, y:g.y+py, w:g.w-px*2, h:g.h-py*2 }; }
  const key = (c,r)=> `${c},${r}`;

  // Spawn
  function spawnMeeting(){
    const total = COLS*ROWS; if (S.occupied.size >= total) return;
    let c=-1,r=-1,found=false;
    for(let i=0;i<64;i++){ c=(Math.random()*COLS)|0; r=(Math.random()*ROWS)|0; if(!S.occupied.has(key(c,r))){found=true;break;} }
    if(!found){ outer: for(let rr=0; rr<ROWS; rr++){ for(let cc=0; cc<COLS; cc++){ if(!S.occupied.has(key(cc,rr))){ c=cc; r=rr; found=true; break outer; } } } }
    if(!found) return;
    S.occupied.add(key(c,r));
    const g = gridRectInset(c,r,2,2);
    const title = NAMES[(Math.random()*NAMES.length)|0];
    const color = COLORS[(Math.random()*COLORS.length)|0];
    S.items.push({ id:Math.random().toString(36).slice(2), c,r, x:g.x,y:g.y,w:g.w,h:g.h, color, title, alive:true, sliced:false });
  }
  function freeCell(it){ S.occupied.delete(key(it.c,it.r)); }

  // Draw grid - с заголовком
  function drawCalendar(){
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
    
    // Заголовок календаря (только "Календарь встреч")
    ctx.fillStyle='#1a73e8'; ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle='#ffffff'; ctx.font='bold 16px Roboto,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Календарь встреч', W/2, HEADER_H/2);
    
    // Счетчик встреч под синим полем слева
    ctx.fillStyle='#000000'; ctx.font='12px Roboto,Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.strokeText('Уничтожено встреч: ' + S.score, 20, HEADER_H + 15);
    ctx.fillText('Уничтожено встреч: ' + S.score, 20, HEADER_H + 15);
    
    // Таймер под синим полем справа
    ctx.fillStyle='#000000'; ctx.font='12px Roboto,Arial'; ctx.textAlign='right'; ctx.textBaseline='middle';
    const timeLeft = S.running ? Math.max(0, S.timeLeft) : 30; // Используем 30 если игра не запущена
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeText = `Осталось: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.strokeText(timeText, W - 20, HEADER_H + 15);
    ctx.fillText(timeText, W - 20, HEADER_H + 15);
    
    // Сетка календаря
    ctx.strokeStyle='#dadce0'; ctx.lineWidth=1; ctx.beginPath();
    for(let c=0;c<=COLS;c++){
      const x=ORGX()+c*GW(); ctx.moveTo(x,ORGY()); ctx.lineTo(x,H-PAD);
      if(c<COLS){ ctx.fillStyle='#1a73e8'; ctx.font='12px Roboto,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(DAYS[c], x+GW()/2, ORGY()-10); }
    }
    for(let r=0;r<=ROWS;r++){
      const y=ORGY()+r*GH(); ctx.moveTo(ORGX(),y); ctx.lineTo(W-PAD,y);
    }
    ctx.stroke();
  }
  function drawGridLinesTop(){
    ctx.save(); ctx.strokeStyle='#dadce0'; ctx.lineWidth=1; ctx.beginPath();
    for(let c=0;c<=COLS;c++){ const x=ORGX()+c*GW(); ctx.moveTo(x,ORGY()); ctx.lineTo(x,H-PAD); }
    for(let r=0;r<=ROWS;r++){ const y=ORGY()+r*GH(); ctx.moveTo(ORGX(),y); ctx.lineTo(W-PAD,y); }
    ctx.stroke();
    ctx.fillStyle='#5f6368'; ctx.font='12px Roboto,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let c=0;c<COLS;c++){ const x=ORGX()+c*GW(); ctx.fillStyle='#1a73e8'; ctx.fillText(DAYS[c], x+GW()/2, ORGY()-10); }
    ctx.restore();
  }

  // Items & parts - оптимизировано для мобильных
  function drawItem(it){
    ctx.fillStyle=it.color; ctx.fillRect(it.x,it.y,it.w,it.h);
    ctx.strokeStyle='#dadce0'; ctx.strokeRect(it.x,it.y,it.w,it.h);
    ctx.save(); ctx.beginPath(); ctx.rect(it.x,it.y,it.w,it.h); ctx.clip();
    
    // Уменьшенный шрифт для маленьких ячеек
    ctx.fillStyle='#202124'; ctx.font='10px Roboto,Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
    const pad=4; // Уменьшили отступы
    
    // Улучшенная обработка текста для мобильных
    let txt=it.title, shown=txt;
    const maxWidth = it.w - pad*2;
    const maxHeight = it.h - pad*2;
    
    // Проверяем, помещается ли текст в одну строку
    if(ctx.measureText(txt).width <= maxWidth) {
      ctx.fillText(txt, it.x+pad, it.y+pad);
    } else {
      // Разбиваем на слова и подбираем оптимальный размер
      const words = txt.split(' ');
      let lines = [];
      let currentLine = '';
      
      for(let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if(ctx.measureText(testLine).width <= maxWidth) {
          currentLine = testLine;
        } else {
          if(currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if(currentLine) lines.push(currentLine);
      
      // Ограничиваем количество строк
      if(lines.length > 2) {
        lines = lines.slice(0, 2);
        if(lines[1].length > 8) {
          lines[1] = lines[1].slice(0, 8) + '...';
        }
      }
      
      // Отрисовываем строки
      const lineHeight = 11; // Уменьшили для меньшего шрифта
      lines.forEach((line, index) => {
        ctx.fillText(line, it.x+pad, it.y+pad + index*lineHeight);
      });
    }
    
    ctx.restore();
  }
  function addParts(it){
    const half=it.w/2-1;
    S.parts.push({ x:it.x, y:it.y, w:half, h:it.h, vy:0, color:it.color, title:it.title, t:1 });
    S.parts.push({ x:it.x+half+2, y:it.y, w:half, h:it.h, vy:0, color:it.color, title:it.title, t:1 });
    // bonus spawn
    if(Math.random()<0.6) spawnMeeting();
  }
  function drawPart(p){
    ctx.globalAlpha=Math.max(0,p.t);
    ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.strokeStyle='#dadce0'; ctx.strokeRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle='#202124'; ctx.font='500 10px Roboto,Arial'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(p.title, p.x+4, p.y+4);
    ctx.globalAlpha=1;
  }

  // Input - оптимизировано для мобильных
  const input={down:false};
  function addSwipePoint(x,y){ S.swipePts.push({x,y,t:performance.now()}); const cut=performance.now()-S.swipeTTL; while(S.swipePts.length && S.swipePts[0].t<cut) S.swipePts.shift(); }
  function onDown(x,y){ input.down=true; addSwipePoint(x,y); }
  function onMove(x,y){ if(!input.down) return; addSwipePoint(x,y); }
  function onUp(){ input.down=false; }
  function rel(e){ const r=canvas.getBoundingClientRect(); const t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0]); if(t) return {x:t.clientX-r.left,y:t.clientY-r.top}; return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  
  // Улучшенная обработка касаний для мобильных
  canvas.addEventListener('pointerdown', e=>{ e.preventDefault(); const p=rel(e); onDown(p.x,p.y); });
  canvas.addEventListener('pointermove', e=>{ e.preventDefault(); const p=rel(e); onMove(p.x,p.y); });
  window.addEventListener('pointerup', e=>{ e.preventDefault(); onUp(); });
  
  // Touch события с предотвращением скролла
  canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const p=rel(e); onDown(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchmove',  e=>{ e.preventDefault(); const p=rel(e); onMove(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchend', e=>{ e.preventDefault(); onUp(); }, {passive:false});

  // Geometry utils
  function segRectHit(x1,y1,x2,y2,rx,ry,rw,rh){ function inside(x,y){ return x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh; } if(inside(x1,y1)||inside(x2,y2))return true; return segSeg(x1,y1,x2,y2,rx,ry,rx+rw,ry)||segSeg(x1,y1,x2,y2,rx,ry,rx,ry+rh)||segSeg(x1,y1,x2,y2,rx+rw,ry,rx+rw,ry+rh)||segSeg(x1,y1,x2,y2,rx,ry+rh,rx+rw,ry+rh); }
  function segSeg(x1,y1,x2,y2,x3,y3,x4,y4){ const d=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4); if(!d) return false; const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/d; const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/d; return t>=0&&t<=1&&u>=0&&u<=1; }

  // Loop
  let raf=0,lastTS=0;
  function loop(ts){
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.032,(ts-lastTS)/1000 || 0); lastTS = ts;
    const elapsed = ts - S.startTS; const remain = Math.max(0, S.roundMs - elapsed); setTimer(remain);
    
    // Обновляем время для таймера
    if(S.running) {
      S.timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));
    }

    // Scheduled banners (new replaces previous, stays 5s)
    if(!S.b5  && elapsed>= 5000){ showBanner('ВСЕ НЕНАВИДЯТ ВСТРЕЧИ!'); S.b5=true; }
    if(!S.b10 && elapsed>=10000){ showBanner('Им бы только поговорить о хуйне'); S.b10=true; }
    if(!S.b15 && elapsed>=15000){ showBanner('О чём можно столько говорить?'); S.b15=true; }
    if(!S.b23 && elapsed>=23000){ showBanner('Дааа, уничтожь их все'); S.b23=true; }

    // Periodic spawn
    if(ts - S.lastSpawn > S.spawnEvery){ spawnMeeting(); S.lastSpawn = ts; }

    // Draw
    drawCalendar();

    // Items
    for(let i=S.items.length-1;i>=0;i--){
      const it=S.items[i];
      if(!it.alive){ S.items.splice(i,1); continue; }
      if(!it.sliced && S.swipePts.length>=2){
        const P=S.swipePts; for(let s=P.length-2;s>=0;s--){ const A=P[s],B=P[s+1]; if(segRectHit(A.x,A.y,B.x,B.y,it.x,it.y,it.w,it.h)){ it.sliced=true; it.alive=false; addParts(it); freeCell(it); setScore(S.score+1); S.items.splice(i,1); break; } }
      }
      drawItem(it);
    }

    // Falling parts
    for(let i=S.parts.length-1;i>=0;i--){ const p=S.parts[i]; p.vy=(p.vy||0)+900*dt; p.y+=p.vy*dt; p.t-=dt*0.8; drawPart(p); if(p.t<=0||p.y>H+60) S.parts.splice(i,1); }

    // Swipe trail & grid overlay
    drawSwipe();
    drawGridLinesTop();

    if(remain<=0) gameOver();
  }

  function drawSwipe(){ const pts=S.swipePts; if(pts.length<2) return; ctx.lineCap='round'; ctx.lineJoin='round'; for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i]; const age=(performance.now()-b.t)/S.swipeTTL; const w=6*(1-Math.min(1,age))+2; ctx.strokeStyle=`rgba(26,115,232,${1-Math.min(1,age)})`; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } }

  // Plural helper
  function plural(n,one,few,many){ n=Math.abs(n)%100; const n1=n%10; if(n>10&&n<20) return many; if(n1>1&&n1<5) return few; if(n1==1) return one; return many; }

  // Round control
  function start(){
    overlay.style.display='none';
    overlay.style.backgroundImage='url(images/start.jpg?v=4)';
    if(sideText) sideText.style.display='block';
    S.running=true; setScore(0);
    S.timeLeft=30; // Инициализируем время
    S.items.length=0; S.parts.length=0; S.swipePts.length=0; S.occupied.clear();
    S.lastSpawn=0; S.startTS=performance.now(); lastTS=S.startTS;
    S.b5=S.b10=S.b15=S.b23=false; if(showBanner._t) clearTimeout(showBanner._t); banner.classList.remove('show'); banner.textContent='';
    cancelAnimationFrame(raf);
    const total = COLS*ROWS; const initial = Math.min(total-6, 28);
    for(let i=0;i<initial;i++) spawnMeeting();
    raf = requestAnimationFrame(loop);
  }

  function gameOver(){
    cancelAnimationFrame(raf);
    S.running=false;
    const word=plural(S.score,'встречу','встречи','встреч');
    if(sideText) sideText.style.display='none';
    overlay.style.display='flex';
    overlay.style.backgroundImage='url(images/end.jpg?v=4)';
    console.log('Game Over - картинка изменена на end.jpg');
    overlay.querySelector('.title').textContent='Офисный ниндзя';
    overlay.querySelector('.subtitle').innerHTML=`Ты уничтожил <b>${S.score}</b> ${word} и сделал свою жизнь лучше, ярче и спокойнее. Сохрани это состояние на день, неделю, год или всю жизнь`;
    startBtn.textContent='Играть ещё раз';
  }

  // Bind & init
  startBtn.addEventListener('click', start);
  setScore(0); setTimer(30000);
})();