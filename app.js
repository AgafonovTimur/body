let path = []; // [] -> категории, [catIdx] -> упражнения, [catIdx, exIdx] -> детали

function goTo(p){ path = p; render(); window.scrollTo(0,0); }
function goBack(){ path.pop(); render(); window.scrollTo(0,0); }

document.addEventListener("keydown", (e)=>{
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
    ex.images.forEach(src=>{
      const img = document.createElement("img");
      img.src = src;
      img.alt = ex.title;
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

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

render();