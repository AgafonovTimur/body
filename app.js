let path = []; // [] -> категории, [catIdx] -> упражнения, [catIdx, exIdx] -> детали

// --- History API: системная кнопка "назад" / свайп-назад на мобильных ---
// Каждый переход вглубь (goTo, открытие лайтбокса) кладёт запись в history.
// Системный "назад" вызывает popstate — мы сами решаем, что делать, вместо
// того чтобы браузер увёл пользователя со страницы.
let suppressPopstate = false; // ставим true, когда сами вызываем history.back() программно

function pushHistoryState(state){
  suppressPopstate = false;
  history.pushState(state, "");
}

function goTo(p){
  path = p;
  pushHistoryState({ path: p.slice() });
  render();
  window.scrollTo(0,0);
}

function goBack(){
  // если в истории есть наша запись — используем её, иначе просто откатываем path
  if(history.state && history.state.path !== undefined){
    suppressPopstate = true;
    history.back();
  } else {
    path.pop();
    render();
    window.scrollTo(0,0);
  }
}

window.addEventListener("popstate", (e)=>{
  if(suppressPopstate){ suppressPopstate = false; return; }

  const lightboxOpen = !!document.getElementById("lightbox-overlay");
  if(lightboxOpen){
    // системный "назад": закрываем лайтбокс, но НЕ уходим на уровень назад в приложении.
    // history уже откатился сам (popstate это подтверждает), запись под лайтбоксом
    // восстанавливать не нужно — просто добавляем новую "текущую" запись сверху,
    // чтобы следующий "назад" снова сработал и увёл на уровень выше.
    closeLightbox(true);
    pushHistoryState({ path: path.slice() });
    return;
  }

  // обычная навигация по уровням
  if(e.state && e.state.path !== undefined){
    path = e.state.path.slice();
  } else {
    path = [];
  }
  render();
  window.scrollTo(0,0);
});

// стартовая запись в истории для корневого уровня
history.replaceState({ path: [] }, "");

document.addEventListener("keydown", (e)=>{
  if(document.getElementById("lightbox-overlay")) return; // лайтбокс сам обрабатывает Escape
  if(path.length === 0) return;
  if(e.code === "Space" || e.code === "Backspace" || e.code === "Escape"){
    e.preventDefault();
    goBack();
  }
});

function render(){
  const app = document.getElementById("app");
  app.innerHTML = "";

  const main = document.createElement("main");
  if(path.length === 2) main.classList.add("level3");
  app.appendChild(main);

  if(path.length === 0) renderLevel1(main);
  else if(path.length === 1) renderLevel2(main, path[0]);
  else renderLevel3(main, path[0], path[1]);
}

function renderLevel1(main){
  const col = document.createElement("div");
  col.className = "btn-col";
  DATA.forEach((cat, idx)=>{
    const btn = document.createElement("div");
    btn.className = "big-btn";
    btn.textContent = cat.title;
    btn.onclick = ()=>goTo([idx]);
    col.appendChild(btn);
  });
  main.appendChild(col);
}

function renderLevel2(main, catIdx){
  const cat = DATA[catIdx];
  if(!cat){ main.innerHTML = '<div class="empty">Не найдено</div>'; return; }
  const col = document.createElement("div");
  col.className = "btn-col";
  if(cat.exercises.length === 0){
    const e = document.createElement("div"); e.className="empty"; e.textContent="Пока пусто";
    col.appendChild(e);
  }
  cat.exercises.forEach((ex, idx)=>{
    const btn = document.createElement("div");
    btn.className = "big-btn";
    btn.textContent = ex.title;
    btn.onclick = ()=>goTo([catIdx, idx]);
    col.appendChild(btn);
  });
  main.appendChild(col);
}

function renderLevel3(main, catIdx, exIdx){
  const cat = DATA[catIdx];
  const ex = cat && cat.exercises[exIdx];
  if(!ex){ main.innerHTML = '<div class="empty">Не найдено</div>'; return; }

  if(ex.images && ex.images.length){
    const scroll = document.createElement("div");
    scroll.className = "imgscroll";
    ex.images.forEach((src, i)=>{
      const img = document.createElement("img");
      img.src = src;
      img.alt = ex.title;
      img.onclick = ()=>openLightbox(ex.images, i, ex.title);
      scroll.appendChild(img);
    });
    main.appendChild(scroll);

    // прокрутка колесом мыши: вниз -> вправо, вверх -> влево
    scroll.addEventListener("wheel", (e)=>{
      if(e.deltaY === 0) return;
      e.preventDefault();
      // deltaMode 1 = "строки" (бывает у некоторых мышей/тачпадов) — там дельта очень маленькая, усиливаем
      const amount = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY * 3;
      scroll.scrollLeft += amount;
    }, { passive: false });
  }

  const d1 = document.createElement("div");
  d1.className = "desc-block";
  d1.innerHTML = '<div class="desc-title">Упражнение</div>' + escapeHtml(ex.desc1 || "заглушка 1");
  main.appendChild(d1);

  const d2 = document.createElement("div");
  d2.className = "desc-block";
  d2.innerHTML = '<div class="desc-title">Описание</div>' + escapeHtml(ex.desc2 || "заглушка 2");
  main.appendChild(d2);
}

let lb = { images: [], index: 0, zoomed: false };

function openLightbox(images, index, alt){
  closeLightbox();
  lb = { images: images, index: index, zoomed: false, alt: alt };

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.id = "lightbox-overlay";
  overlay.onclick = closeLightbox;
  document.body.appendChild(overlay);

  // отдельная запись в истории для лайтбокса — системный "назад" / свайп-назад
  // должен закрыть именно лайтбокс, а не увести на уровень выше
  pushHistoryState({ path: path.slice(), lightbox: true });

  renderLightbox();
  attachLightboxSwipe(overlay);
}

function renderLightbox(){
  const overlay = document.getElementById("lightbox-overlay");
  if(!overlay) return;
  overlay.innerHTML = "";

  const img = document.createElement("img");
  img.src = lb.images[lb.index];
  img.alt = lb.alt || "";
  img.className = "lightbox-img" + (lb.zoomed ? " zoomed" : "");
  img.onclick = (e)=>{
    e.stopPropagation(); // клик по фото не закрывает лайтбокс
    lb.zoomed = !lb.zoomed; // переключаем 100% <-> 200%
    renderLightbox();
  };
  overlay.appendChild(img);

  if(lb.images.length > 1){
    const prev = document.createElement("div");
    prev.className = "lightbox-nav lightbox-prev";
    prev.textContent = "‹";
    prev.onclick = (e)=>{ e.stopPropagation(); lightboxStep(-1); };
    overlay.appendChild(prev);

    const next = document.createElement("div");
    next.className = "lightbox-nav lightbox-next";
    next.textContent = "›";
    next.onclick = (e)=>{ e.stopPropagation(); lightboxStep(1); };
    overlay.appendChild(next);
  }
}

function lightboxStep(dir){
  const n = lb.images.length;
  lb.index = (lb.index + dir + n) % n;
  lb.zoomed = false; // при листании всегда сбрасываем зум до 100%
  renderLightbox();
}

function closeLightbox(fromPopstate){
  const overlay = document.getElementById("lightbox-overlay");
  if(overlay) overlay.remove();
  // если закрытие вызвано кликом/кнопкой (не системным "назад"), убираем
  // запись лайтбокса из истории, чтобы она не мешала следующему "назад"
  if(!fromPopstate && history.state && history.state.lightbox){
    suppressPopstate = true;
    history.back();
  }
}

// --- свайп по фото в лайтбоксе: влево/вправо листает картинки ---
function attachLightboxSwipe(overlay){
  let startX = 0, startY = 0, tracking = false;
  const threshold = 40; // минимальная длина свайпа в px

  overlay.addEventListener("touchstart", (e)=>{
    if(e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  overlay.addEventListener("touchend", (e)=>{
    if(!tracking) return;
    tracking = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if(Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)){
      if(dx < 0) lightboxStep(1);  // свайп влево -> следующее фото
      else lightboxStep(-1);        // свайп вправо -> предыдущее фото
    }
  }, { passive: true });
}

document.addEventListener("keydown", (e)=>{
  if(!document.getElementById("lightbox-overlay")) return;
  if(e.code === "Escape"){ closeLightbox(); return; }
  if(e.code === "ArrowLeft"){ e.preventDefault(); lightboxStep(-1); return; }
  if(e.code === "ArrowRight"){ e.preventDefault(); lightboxStep(1); return; }
});

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

render();