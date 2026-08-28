let path = []; // [] -> категории, [catIdx] -> упражнения, [catIdx, exIdx] -> детали

// --- History API: системная кнопка "назад" / свайп-назад на мобильных ---
// Подход без history.back(): при закрытии лайтбокса кликом/крестиком мы
// НЕ откатываем историю назад, а просто заменяем текущую запись (replaceState)
// на "лайтбокс закрыт". Так реальная позиция в history всегда соответствует
// текущему состоянию экрана, и не бывает рассинхронизации счётчика записей
// (которая раньше вызывала "не сработало с 1-2 попытки" / дребезг).
//
// Системный "назад" всегда даёт ровно один popstate на одно нажание —
// мы читаем его state и просто рендерим то, что там записано.

function goTo(p){
  path = p;
  history.pushState({ path: p.slice(), lightbox: false }, "");
  render();
  window.scrollTo(0,0);
}

function goBack(){
  history.back();
}

window.addEventListener("popstate", (e)=>{
  const state = e.state || { path: [], lightbox: false };
  const lightboxWasOpen = !!document.getElementById("lightbox-overlay");
  const shouldShowLightbox = !!state.lightbox;

  path = (state.path || []).slice();

  if(lightboxWasOpen && !shouldShowLightbox){
    // "назад" закрыл лайтбокс — просто убираем оверлей, path не менялся
    removeLightboxDom();
    render();
  } else if(!lightboxWasOpen && shouldShowLightbox){
    // такое штатно не должно происходить (лайтбокс не открывается кнопкой "вперёд"),
    // но на всякий случай просто рендерим текущий уровень
    render();
  } else {
    render();
  }
  window.scrollTo(0,0);
});

// стартовая запись в истории для корневого уровня
history.replaceState({ path: [], lightbox: false }, "");

// клавиши 1 / 2 / 3 переключают вкладки описания на экране упражнения
document.addEventListener("keydown", (e)=>{
  if(document.getElementById("lightbox-overlay")) return;
  if(e.ctrlKey || e.altKey || e.metaKey) return;
  const n = { "1":0, "2":1, "3":2 }[e.key];
  if(n === undefined) return;
  if(!descTabButtons[n]) return;
  e.preventDefault();
  descTabButtons[n].click();
});

document.addEventListener("keydown", (e)=>{
  if(document.getElementById("lightbox-overlay")) return; // лайтбокс сам обрабатывает Escape
  if(path.length === 0) return;
  if(e.code === "Space" || e.code === "Backspace" || e.code === "Escape"){
    e.preventDefault();
    path.pop();
    history.pushState({ path: path.slice(), lightbox: false }, "");
    render();
    window.scrollTo(0,0);
  }
});

// --- Свой свайп-жест "назад" (не зависит от системного жеста браузера) ---
// Свайп вправо в любом месте экрана вызывает goBack(), КРОМЕ зоны галереи
// фото (.imgscroll) — там свайп должен листать/скроллить сами миниатюры.
// Работает только вне лайтбокса (там свайп используется для листания фото)
// и только если есть куда возвращаться (path.length > 0).
(function(){
  const THRESHOLD = 60;     // минимальная длина свайпа по X
  const MAX_VERTICAL = 60;  // если свайп слишком "косой" (вертикальный) — не считаем

  let startX = 0, startY = 0, tracking = false;

  document.addEventListener("touchstart", (e)=>{
    if(document.getElementById("lightbox-overlay")) return;
    if(path.length === 0) return;
    if(e.touches.length !== 1) return;
    if(e.target.closest(".imgscroll")) return; // жест внутри галереи — не трогаем, там своя прокрутка
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchend", (e)=>{
    if(!tracking) return;
    tracking = false;
    if(document.getElementById("lightbox-overlay")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    if(dx > THRESHOLD && dy < MAX_VERTICAL){
      goBack();
    }
  }, { passive: true });

  document.addEventListener("touchcancel", ()=>{ tracking = false; }, { passive: true });
})();

function render(){
  const app = document.getElementById("app");
  app.innerHTML = "";
  descTabButtons = [];

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

  main.appendChild(buildDescTabs(ex));
}

// кнопки вкладок текущего экрана упражнения (для клавиш 1 / 2 / 3)
let descTabButtons = [];

// --- Блок описания с тремя вкладками ---
// Вкладки: "обычная тренировка" (desc2), "легкая тренировка" (desc3),
// "силовая тренировка" (desc4). Картинки общие — галерея сверху одна.
// Переключение вкладки меняет только текст, экран целиком не перерисовывается.
function buildDescTabs(ex){
  const tabs = [
    { label: "обычная тренировка", text: ex.desc2 || "заглушка 2" },
    { label: "легкая тренировка",  text: ex.desc3 || ((ex.title || "") + "11111") },
    { label: "силовая тренировка", text: ex.desc4 || ((ex.title || "") + "22222") }
  ];

  const block = document.createElement("div");
  block.className = "desc-block";

  const row = document.createElement("div");
  row.className = "tabs-row";

  const body = document.createElement("div");
  body.className = "tab-body";

  const buttons = [];
  tabs.forEach((t, i)=>{
    const btn = document.createElement("div");
    btn.className = "tab-btn" + (i === 0 ? " active" : "");
    btn.textContent = t.label;
    btn.onclick = ()=>{
      buttons.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      body.textContent = t.text;
    };
    buttons.push(btn);
    row.appendChild(btn);
  });

  body.textContent = tabs[0].text;
  descTabButtons = buttons; // для переключения клавишами 1 / 2 / 3

  block.appendChild(row);
  block.appendChild(body);
  return block;
}

let lb = { images: [], index: 0, zoomed: false };

function openLightbox(images, index, alt){
  removeLightboxDom();
  lb = { images: images, index: index, zoomed: false, alt: alt };

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.id = "lightbox-overlay";
  overlay.onclick = closeLightbox;
  document.body.appendChild(overlay);

  // отдельная запись в истории для лайтбокса — системный "назад" / свайп-назад
  // должен закрыть именно лайтбокс, а не увести на уровень выше
  history.pushState({ path: path.slice(), lightbox: true }, "");

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

function removeLightboxDom(){
  const overlay = document.getElementById("lightbox-overlay");
  if(overlay) overlay.remove();
}

function closeLightbox(){
  // клик по фону / крестик / Escape / выбор фото завершён — закрываем лайтбокс
  // штатным способом: убираем DOM и синхронно заменяем текущую запись истории
  // (replaceState, не back()) на "лайтбокс закрыт". Это не создаёт лишних
  // прыжков в history и не зависит от асинхронного popstate, поэтому
  // повторные быстрые открытия/закрытия не рассинхронизируются.
  removeLightboxDom();
  if(history.state && history.state.lightbox){
    history.replaceState({ path: path.slice(), lightbox: false }, "");
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