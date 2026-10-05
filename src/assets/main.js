(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: scuro sopra le foto, chiaro sopra le sezioni bianche (come Atlantis) */
  var hd = $("#hd"), themed = $$("[data-theme]");
  function headerTheme() {
    var y = 40, theme = "dark";
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { theme = themed[i].getAttribute("data-theme"); break; }
    }
    hd.classList.toggle("is-dark", theme === "dark");
    hd.classList.toggle("is-light", theme === "light");
  }

  /* Pannelli a scorrimento: sezione alta n×100vh con contenuto sticky.
     I pannelli non attivi restano leggibili dai lettori di schermo (solo trasparenti, vedi CSS) ma i loro link escono
     dall'ordine di Tab (tabindex=-1); se il focus era nel pannello che sta per sparire viene tolto. */
  var story = $("#hotel"), bgs = $$(".story__bg"), txts = $$(".story__t"), dots = $$("#dots li"), cur = 0;
  function panelTab(i, on) {
    $$("a, button", txts[i]).forEach(function (el) { if (on) el.removeAttribute("tabindex"); else el.setAttribute("tabindex", "-1"); });
  }
  function setPanel(n) {
    if (n === cur) return;
    var ae = document.activeElement;
    if (ae && txts[cur].contains(ae)) ae.blur();
    bgs[cur].classList.remove("is-on"); txts[cur].classList.remove("is-on"); dots[cur].classList.remove("is-on");
    txts[cur].removeAttribute("aria-current"); panelTab(cur, false);
    cur = n;
    bgs[cur].classList.add("is-on"); txts[cur].classList.add("is-on"); dots[cur].classList.add("is-on");
    txts[cur].setAttribute("aria-current", "true"); panelTab(cur, true);
  }
  function storyScroll() {
    var r = story.getBoundingClientRect(), range = story.offsetHeight - window.innerHeight;
    if (range <= 0) return;
    var p = Math.min(1, Math.max(0, -r.top / range));
    setPanel(Math.min(bgs.length - 1, Math.round(p * (bgs.length - 1))));
  }

  /* Barra CTA mobile: compare dopo l'hero; si nasconde quando la sezione finale è visibile
     o quando un pulsante primario (.btn-f) della pagina è già in vista sopra di lei: una sola azione primaria per schermata */
  var sticky = $("#sticky"), heroEl = $("#top"), finEl = $("#richiesta"), prim = $$("main .btn-f");
  function stickyBar() {
    if (!sticky) return;
    var past = heroEl.getBoundingClientRect().bottom < 0;
    var fr = finEl.getBoundingClientRect(), inFin = fr.top < window.innerHeight * 0.85 && fr.bottom > 0;
    var limit = window.innerHeight - sticky.offsetHeight;
    var busy = prim.some(function (b) { var r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < limit; });
    sticky.classList.toggle("is-on", past && !inFin && !busy);
  }

  /* Misurazione: eventi su dataLayer (compatibile con GTM/GA4, nessuno script esterno caricato) */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) { params = params || {}; params.event = name; window.dataLayer.push(params); }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-cta]");
    if (!el) return;
    var c = el.cloneNode(true); /* il testo per screen reader (.sr) non fa parte dell'etichetta misurata */
    $$(".sr", c).forEach(function (s) { s.parentNode.removeChild(s); });
    var isBook = el.tagName === "A" && /simplebooking\./.test(el.getAttribute("href") || "");
    track(isBook ? "booking_click" : "cta_click", { cta_location: el.getAttribute("data-cta"), cta_text: (c.textContent || "").trim() });
  });

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { headerTheme(); storyScroll(); stickyBar(); ticking = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  headerTheme(); storyScroll(); stickyBar();

  /* Neve nell'hero: poche decine di fiocchi su canvas, ferma fuori schermo, con scheda in background e con "riduci movimento" */
  var cv = $("#snow");
  if (cv && !reduce && cv.getContext) {
    var cx = cv.getContext("2d"), flakes = [], W = 0, H = 0, raf = 0, vis = true, dpr = Math.min(2, window.devicePixelRatio || 1);
    var sizeSnow = function () {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 700 ? 45 : 95;
      while (flakes.length < n) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.9, v: .25 + Math.random() * .75, p: Math.random() * 6.28, a: .25 + Math.random() * .6 });
      flakes.length = n;
    };
    var frame = function (t) {
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.v; f.x += Math.sin(t / 1400 + f.p) * .35;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        if (f.x > W + 4) f.x = -4; else if (f.x < -4) f.x = W + 4;
        cx.globalAlpha = f.a; cx.fillStyle = "#fff";
        cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.2832); cx.fill();
      }
      raf = vis && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    var kick = function () { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(frame); };
    sizeSnow(); window.addEventListener("resize", sizeSnow);
    document.addEventListener("visibilitychange", kick);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { vis = en[0].isIntersecting; kick(); }).observe(heroEl);
    }
    kick();
  }

  /* Porta il focus su un elemento che sta comparendo con una transizione di visibility (il primo tentativo può cadere mentre è ancora "hidden") */
  function focusSoon(el, tries) {
    if (tries == null) tries = 12;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el && tries > 0) setTimeout(function () { focusSoon(el, tries - 1); }, 30);
  }

  /* Menu a tutto schermo: il focus entra nel menu all'apertura, Tab/Maiusc+Tab restano dentro (trap), il resto della pagina è inert,
     Esc e clic sullo sfondo lo chiudono, il focus torna all'hamburger. Con un link a un'ancora della pagina il menu si chiude e il
     focus resta sulla destinazione; i link che aprono un'altra scheda lasciano il menu aperto. */
  var menu = $("#menu"), mBtn = $("#menuBtn"), mX = $("#menuX");
  function menuItems() { return $$("button, a[href]", menu).filter(function (el) { return el.getClientRects().length > 0; }); }
  function setInert(on) { $$(".skip, #hd, #main, .ft, #sticky").forEach(function (el) { el.inert = on; }); }
  function setMenu(open, keepFocus) {
    if (open) { menu.hidden = false; void menu.offsetWidth; }
    menu.classList.toggle("is-open", open);
    mBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    setInert(open);
    if (open) focusSoon(mX);
    else {
      setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 520);
      if (!keepFocus) mBtn.focus({ preventScroll: true });
    }
  }
  mBtn.addEventListener("click", function () { setMenu(true); });
  mX.addEventListener("click", function () { setMenu(false); });
  menu.addEventListener("click", function (e) {
    var a = e.target.closest(".menu__nav a");
    if (a) { if (a.target !== "_blank") setMenu(false, true); return; }
    if (e.target === menu) setMenu(false); /* clic sullo sfondo vuoto */
  });
  document.addEventListener("keydown", function (e) {
    if (!menu.classList.contains("is-open")) return;
    if (e.key === "Escape") { setMenu(false); return; }
    if (e.key !== "Tab") return;
    var items = menuItems(); if (!items.length) return;
    var first = items[0], last = items[items.length - 1], ae = document.activeElement;
    if (!menu.contains(ae)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
  });

  /* Carosello "In evidenza": nessun avanzamento automatico; frecce a fine corsa attenuate (aria-disabled, il focus non si perde).
     La variabile si chiama rail e non track: track() è la funzione di misurazione qui sopra. */
  var rail = $("#track"), bar = $("#bar"), prev = $("#prev"), next = $("#next");
  function pitch() { var c = $(".scard", rail); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 40) : 392; }
  function updBar() {
    var max = rail.scrollWidth - rail.clientWidth;
    var w = Math.max(12, (rail.clientWidth / rail.scrollWidth) * 100);
    bar.style.width = w + "%";
    bar.style.left = (max > 0 ? (rail.scrollLeft / max) * (100 - w) : 0) + "%";
    prev.setAttribute("aria-disabled", rail.scrollLeft <= 1 ? "true" : "false");
    next.setAttribute("aria-disabled", max <= 1 || rail.scrollLeft >= max - 1 ? "true" : "false");
  }
  /* più pressioni ravvicinate (frecce da tastiera, clic ripetuti) si sommano: il punto di arrivo parte dal traguardo precedente finché lo scorrimento è in corso */
  var goal = null, goalT = 0;
  function slide(dir) {
    var max = rail.scrollWidth - rail.clientWidth;
    goal = Math.max(0, Math.min(max, (goal == null ? rail.scrollLeft : goal) + dir * pitch()));
    rail.scrollTo({ left: goal, behavior: reduce ? "auto" : "smooth" });
    clearTimeout(goalT); goalT = setTimeout(function () { goal = null; }, 500);
  }
  prev.addEventListener("click", function () { slide(-1); });
  next.addEventListener("click", function () { slide(1); });
  rail.addEventListener("scroll", updBar, { passive: true });
  window.addEventListener("resize", updBar);
  rail.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
  });
  updBar();

  /* Mappa: nessuna connessione a terzi finché l'utente non la richiede */
  $$(".map").forEach(function (box) {
    var btn = $(".map__btn", box);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var fr = document.createElement("iframe");
      fr.className = "map__f"; fr.src = box.getAttribute("data-src"); fr.title = box.getAttribute("data-title");
      fr.loading = "lazy"; fr.referrerPolicy = "no-referrer";
      box.innerHTML = ""; box.appendChild(fr); box.classList.add("is-on");
    });
  });

  /* Reveal */
  var items = $$(".spot__l, .scard, .stay__c, .grid4 article, .tipo, .direct__l, .direct__g li, .where__l, .where__map, .proof div, .faq__l, .faq__r, .fin__c, .ft__main");
  items.forEach(function (el) { el.classList.add("rv"); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add("in"); }); }

  /* Pannello richiesta di proposta (dialog): Esc, X e clic sullo sfondo lo chiudono; il focus torna al pulsante che l'ha aperto; i dati restano nel modulo. */
  var dlg = $("#req"), f = $("#quote"), err = $("#formErr"), opener = null;
  function openReq(e) {
    opener = (e && e.currentTarget) || document.activeElement;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    requestAnimationFrame(function () { dlg.classList.add("in"); });
  }
  function closeReq() {
    dlg.classList.remove("in");
    setTimeout(function () {
      if (dlg.open) { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
      if (typeof dlg.showModal !== "function" && opener) opener.focus(); /* i browser con <dialog> nativo rimettono già il focus sul pulsante */
    }, reduce ? 0 : 420);
  }
  $$("[data-open='req']").forEach(function (b) { b.setAttribute("aria-haspopup", "dialog"); b.addEventListener("click", openReq); });
  $("#reqX").addEventListener("click", closeReq);
  /* Clic sullo sfondo: conta solo se pressione e rilascio avvengono fuori dal pannello */
  var downOut = false;
  function outsideDlg(e) { var r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; }
  dlg.addEventListener("pointerdown", function (e) { downOut = e.target === dlg && outsideDlg(e); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg && downOut && outsideDlg(e)) closeReq(); downOut = false; });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeReq(); });

  /* Date: minimo oggi (data locale, non UTC), massimo tra 3 anni; la partenza non può precedere l'arrivo. */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dnum(s) { var m = /^(\d{4,6})-(\d\d)-(\d\d)$/.exec(s || ""); return m ? (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]) : NaN; }
  var now0 = new Date(), tMin = iso(now0), tMax = iso(new Date(now0.getFullYear() + 3, now0.getMonth(), now0.getDate()));
  f.checkin.min = tMin; f.checkout.min = tMin; f.checkin.max = tMax; f.checkout.max = tMax;

  /* Validazione + apertura del client di posta con la richiesta già compilata.
     Per un invio server-side sostituire con una fetch() verso un endpoint (es. Formspree).
     Lo stato di errore non dipende dal solo colore: classe .bad (bordo più spesso + testo .fe) + aria-invalid e aria-describedby. */
  function mark(el, invalid, n) {
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
    if (invalid) el.setAttribute("aria-describedby", "fe-" + n); else el.removeAttribute("aria-describedby");
  }
  /* Un messaggio specifico per ogni caso (vuoto, formato, data passata, partenza prima dell'arrivo, numero fuori intervallo). "" = campo valido */
  var E = window.NV.err;
  function why(n) {
    var v = f[n].value.trim(), a, b, x;
    switch (n) {
      case "name": return v ? "" : E.name;
      case "email": return !v ? E.email0 : (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "" : E.email1);
      case "checkin":
        a = dnum(v);
        if (isNaN(a)) return E.in0;
        if (a < dnum(tMin)) return E.in1;
        return a > dnum(tMax) ? E.in2 : "";
      case "checkout":
        b = dnum(v); a = dnum(f.checkin.value);
        if (isNaN(b)) return E.out0;
        if (!isNaN(a) && b < a) return E.out1;
        return (b < dnum(tMin) || b > dnum(tMax)) ? E.out2 : "";
      case "adults":
        if (v === "") return E.adults;
        x = Number(v);
        return (x === Math.floor(x) && x >= 1 && x <= 6) ? "" : E.adults;
    }
    return "";
  }
  function check(n) {
    var m = why(n), bad = m !== "", fe = $("#fe-" + n);
    if (bad && fe) fe.textContent = m;
    f[n].classList.toggle("bad", bad);
    mark(f[n], bad, n);
    return !bad;
  }
  function checkPriv() {
    var bad = !f.privacy.checked;
    f.privacy.classList.toggle("bad", bad);
    mark(f.privacy, bad, "privacy");
    return !bad;
  }

  /* Stato "richiesta preparata": il modulo non ha un server, apre il programma di posta; senza conferma l'utente non sa se è successo qualcosa.
     Il paragrafo role="status" è sempre nel DOM (vuoto) e il testo viene inserito dopo, così viene annunciato. */
  var okBox = $("#reqOk"), okMsg = $("#reqOkMsg"), okAlt = $("#reqOkAlt"), retry = $("#reqRetry");
  var okTimer = 0;
  function okClear() {
    clearTimeout(okTimer);
    if (!okBox.classList.contains("on")) return;
    okBox.classList.remove("on"); okMsg.textContent = ""; okAlt.hidden = true;
  }
  function okShow(t, m) {
    clearTimeout(okTimer);
    okMsg.textContent = ""; okBox.classList.add("on"); okAlt.hidden = false;
    okTimer = setTimeout(function () {
      var b = document.createElement("b"); b.textContent = t + ".";
      okMsg.appendChild(b); okMsg.appendChild(document.createTextNode(" " + m));
      okBox.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }, 80);
  }
  function mailHref() {
    var L = window.NV.lbl, v = function (n) { return f[n].value.trim(); };
    var lines = [
      L.name + ": " + v("name"), L.email + ": " + v("email"), L.phone + ": " + (v("phone") || "-"),
      L.checkin + ": " + v("checkin"), L.checkout + ": " + v("checkout"),
      L.adults + ": " + v("adults"), L.room + ": " + v("room"), "", v("message")
    ];
    return "mailto:" + window.NV.to + "?subject=" + encodeURIComponent(window.NV.subject) +
      "&body=" + encodeURIComponent(lines.join("\r\n"));
  }

  /* Correzione in tempo reale: i campi già segnalati si ripuliscono appena il valore è corretto (senza mostrare errori nuovi mentre si scrive);
     qualsiasi modifica dopo l'invio toglie lo stato "preparata", che non descriverebbe più il modulo. */
  function onEdit(e) {
    var t = e.target, n = t.name, fin = e.type === "change"; /* durante la digitazione (input) un campo segnalato si ripulisce solo se ora è valido; a fine modifica (change) il messaggio viene rivalutato */
    function recheck(k) { if (fin || why(k) === "") check(k); }
    okClear();
    if (n === "privacy") { if (t.classList.contains("bad")) checkPriv(); }
    else if (n === "checkin") {
      f.checkout.min = dnum(f.checkin.value) > dnum(tMin) ? f.checkin.value : tMin;
      if (t.classList.contains("bad")) recheck("checkin");
      if (f.checkout.value || f.checkout.classList.contains("bad")) recheck("checkout"); /* partenza ora precedente al nuovo arrivo: lo si dice subito, senza modificare il dato */
    } else if (t.classList.contains("bad")) recheck(n);
    if (!f.querySelector(".bad")) err.hidden = true;
  }
  f.addEventListener("input", onEdit);
  f.addEventListener("change", onEdit);

  var lastHref = "", lastAt = 0;
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = false;
    ["name", "email", "checkin", "checkout", "adults"].forEach(function (n) { if (!check(n)) bad = true; });
    if (!checkPriv()) bad = true;
    err.hidden = !bad;
    if (bad) { okClear(); (f.querySelector(".bad") || f.privacy).focus(); return; }
    var href = mailHref(), t = Date.now(), ok = window.NV.ok;
    retry.href = href;
    /* doppio invio: stessa richiesta entro 8 secondi = non si riapre un secondo programma di posta */
    if (href === lastHref && t - lastAt < 8000) { okShow(ok.t2, ok.m2); return; }
    lastHref = href; lastAt = t;
    track("generate_lead", { form: "richiesta_proposta", room: f.room.value, nights_from: f.checkin.value });
    okShow(ok.t, ok.m);
    window.location.href = href;
  });
})();
