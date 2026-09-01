const state = {
  articles: [],
  authors: [],
  categories: [],
  settings: {},
  about: {},
  contact: {},
  category: "all",
  query: "",
  searchMode: "both",
  searchOpen: false,
  currentGallery: [],
  galleryIndex: 0
};

const $ = (s) => document.querySelector(s);

async function loadData() {
  const [settings, about, contact, authors, categories, articles] = await Promise.all([
    fetch("/data/settings.json").then(r=>r.json()),
    fetch("/data/about.json").then(r=>r.json()),
    fetch("/data/contact.json").then(r=>r.json()),
    fetch("/data/authors.json").then(r=>r.json()),
    fetch("/data/categories.json").then(r=>r.json()),
    fetch("/data/articles.json").then(r=>r.json())
  ]);
  Object.assign(state, {settings,about,contact,authors,categories,articles});
  renderBanner();
  route();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function formatDate(d) {
  return new Intl.DateTimeFormat("ro-RO",{year:"numeric",month:"long",day:"numeric"}).format(new Date(d));
}
function categoryBySlug(slug) {
  return state.categories.find(c => c.slug === slug);
}
function authorBySlug(slug) {
  return state.authors.find(a => a.slug === slug);
}
function plainText(md) {
  return String(md || "")
    .replace(/<[^>]*>/g," ")
    .replace(/[#*_`>\[\]()]/g," ")
    .replace(/\s+/g," ").trim();
}
function highlight(text) {
  const safe = esc(text);
  if (!state.query.trim()) return safe;
  const words = state.query.trim().split(/\s+/).filter(Boolean).map(esc);
  const re = new RegExp("(" + words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|") + ")", "gi");
  return safe.replace(re,'<mark class="highlight">$1</mark>');
}
function renderBanner() {
  const s=state.settings;
  $("#banner-root").innerHTML = s.banner_enabled ? `
    <div class="banner"><div class="container banner-inner">
      <strong>${esc(s.banner_icon||"🐣")} ${esc(s.banner_title||"")}</strong>
      <small>${esc(s.banner_text||"")}</small>
    </div></div>` : "";
}
function renderHome() {
  const cats = state.categories;
  const selectedCategory = categoryBySlug(state.category);
  const hasCategoryArticles = state.category === "all" || state.articles.some(a => a.category === state.category);
  const filtered = state.articles.filter(a => {
    const catOk = state.category==="all" || a.category===state.category;
    const q = state.query.trim().toLowerCase();
    if (!catOk) return false;
    if (!q) return true;
    const hayTitle = String(a.title||"").toLowerCase();
    const hayBody = plainText(a.body).toLowerCase();
    return hayTitle.includes(q)||hayBody.includes(q);
  });
  const emptyMessage = state.query.trim()
    ? "Nu am găsit articole care să corespundă căutării."
    : state.category !== "all"
      ? "În curând, un articol nou te va aștepta aici!"
      : "În curând, articole noi te vor aștepta aici.";

  $("#app").innerHTML = `
    <section>
      <div class="section-heading">
        <div>
          <h1>Articole recente</h1>
        </div>
      </div>

      <div class="filters-wrap">
        <button class="filter all-filter ${state.category==="all"?"active":""}" data-cat="all">Toate</button>
        <div class="filters" aria-label="Filtrează articolele">
          ${cats.map(c=>`<button class="filter ${state.category===c.slug?"active":""}" data-cat="${esc(c.slug)}">${esc(c.icon||"")} ${esc(c.name)}</button>`).join("")}
        </div>
      </div>

      ${selectedCategory ? `<p class="category-description">${esc(selectedCategory.description||"")}</p>` : ""}

      ${hasCategoryArticles ? `<div class="search-panel">
        <div class="search-row">
          <label class="search-field" id="search-field">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <input id="search" type="search" placeholder="Caută" aria-label="Caută în ${selectedCategory ? esc(selectedCategory.name) : "toate articolele"}" value="${esc(state.query)}">
          </label>
        </div>
      </div>` : ""}

      <div>
        ${filtered.length ? filtered.map(renderCard).join("") : `<div class="empty">${emptyMessage}</div>`}
      </div>
    </section>`;

  const search = $("#search");
  const searchField = $("#search-field");
  search?.addEventListener("focus", () => {
    searchField.classList.add("focused");
    search.placeholder = `Caută în ${selectedCategory ? selectedCategory.name : "toate articolele"}`;
  });
  search?.addEventListener("blur", () => {
    searchField.classList.remove("focused");
    search.placeholder = "Caută";
  });
  search?.addEventListener("input", e => {
    state.query=e.target.value;
    const filtered = state.articles.filter(a => {
      const catOk = state.category==="all" || a.category===state.category;
      if (!catOk) return false;
      const q = state.query.trim().toLowerCase();
      if (!q) return true;
      const hayTitle = String(a.title||"").toLowerCase();
      const hayBody = plainText(a.body).toLowerCase();
      return hayTitle.includes(q)||hayBody.includes(q);
    });
    const cards = document.querySelectorAll(".article-card");
    cards.forEach(card => {
      const slug = card.dataset.slug;
      const visible = filtered.some(a => (a.slug || slugFromTitle(a.title)) === slug);
      card.style.display = visible ? "" : "none";
    });
    const empty = document.querySelector(".empty");
    if (empty) empty.style.display = filtered.length ? "none" : "block";
  });
  document.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{
    state.category=b.dataset.cat;
    state.query="";
    state.searchOpen=false;
    renderHome();
    document.querySelector(`[data-cat="${CSS.escape(state.category)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }));
  document.querySelectorAll(".article-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      const slug = card.dataset.slug;
      if (slug) location.hash = `#/article/${encodeURIComponent(slug)}`;
    });
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const slug = card.dataset.slug;
        if (slug) location.hash = `#/article/${encodeURIComponent(slug)}`;
      }
    });
  });
}
function renderCard(a) {
  const cat=categoryBySlug(a.category);
  const excerpt=plainText(a.body).slice(0,240);
  const slug = a.slug || slugFromTitle(a.title);
  return `<article class="article-card" data-slug="${esc(slug)}" tabindex="0" role="link" aria-label="Deschide articolul ${esc(a.title)}">
    ${a.hero_image ? `<img class="article-card-image" src="${esc(a.hero_image)}" alt="${esc(a.hero_caption||a.title)}" loading="lazy">` : ""}
    <div class="meta"><span>${formatDate(a.date)}</span><span>${esc(cat?.icon||"")} ${esc(cat?.name||a.category||"")}</span></div>
    <h2><a href="#/article/${encodeURIComponent(slug)}">${highlight(a.title)}</a></h2>
    <p class="card-excerpt">${highlight(excerpt)}${excerpt.length>=240?"…":""}</p>
  </article>`;
}
function slugFromTitle(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

function normalizeSources(raw) {
  if (Array.isArray(raw)) {
    return raw.map(String).map(s => s.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map(s => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}
function parseSourceEntry(entry) {
  const value = String(entry || "").trim();
  const match = value.match(/^(?:([^|:]+?)\s*[-–—|:]\s*)?(https?:\/\/\S+)$/i);
  if (match) {
    const label = match[1]?.trim();
    const url = match[2];
    return {
      url,
      label: label || (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return url;
        }
      })()
    };
  }
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(value)) {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return {
      url,
      label: (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return value;
        }
      })()
    };
  }
  return null;
}
function renderArticle(id) {
  const a=state.articles.find(x => (x.slug||slugFromTitle(x.title))===id);
  if(!a){ $("#app").innerHTML='<div class="empty">Știrea nu a fost găsită.</div>'; return; }
  const cat=categoryBySlug(a.category);
  const author = authorBySlug(a.author) || { name: "Redacția NFM" };
  const body=markdownToHtml(a.body||"");
  const gallery=a.gallery||[];
  const sources=normalizeSources(a.source_url);
  const sourceMarkup=sources.length ? `
    <section class="sources">
      <h3>Surse</h3>
      <ul>${sources.map(item => {
        const source = parseSourceEntry(item);
        if (!source) return `<li>${esc(item)}</li>`;
        return `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a></li>`;
      }).join("")}</ul>
    </section>
  ` : "";
  const authorMarkup = `<div class="article-meta-row article-author-row"><span>${esc(author.name)}</span></div>`;
  $("#app").innerHTML=`<article class="article">
    <header class="article-header">
      <div class="article-meta-row"><span>${formatDate(a.date)}</span><span>${esc(cat?.icon||"")} ${esc(cat?.name||a.category||"")}</span></div>
      ${authorMarkup}
      <h1>${esc(a.title)}</h1>
    </header>
    ${a.hero_image?`<figure class="hero-figure"><img src="${esc(a.hero_image)}" alt="${esc(a.hero_caption||a.title)}" loading="eager"><figcaption>${esc(a.hero_caption||"")}</figcaption></figure>`:""}
    <div class="article-body">${body}</div>
    ${sourceMarkup}
    ${gallery.length?`<section class="gallery"><h2>Galerie imagini</h2><div class="gallery-carousel"><button class="gallery-arrow gallery-prev" data-gallery-prev aria-label="Imaginea anterioară">‹</button><button class="gallery-slide" data-gallery="0" aria-label="Deschide galeria fullscreen"><img src="${esc(gallery[0].image)}" alt="${esc(gallery[0].caption||"")}" loading="lazy"><span class="gallery-caption">${esc(gallery[0].caption||"")}</span></button><button class="gallery-arrow gallery-next" data-gallery-next aria-label="Imaginea următoare">›</button></div><div class="gallery-count">1 / ${gallery.length}</div></section>`:""}
  </article>`;
  state.currentGallery=gallery;
  let carouselIndex=0;
  const carouselImage=()=>{
    const item=gallery[carouselIndex];
    const slide=$(".gallery-slide");
    slide.querySelector("img").src=item.image;
    slide.querySelector("img").alt=item.caption||"";
    slide.querySelector(".gallery-caption").textContent=item.caption||"";
    $(".gallery-count").textContent=`${carouselIndex+1} / ${gallery.length}`;
  };
  document.querySelectorAll("[data-gallery]").forEach(b=>b.addEventListener("click",()=>openLightbox(carouselIndex)));
  $("[data-gallery-prev]")?.addEventListener("click",()=>{carouselIndex=(carouselIndex-1+gallery.length)%gallery.length;carouselImage();});
  $("[data-gallery-next]")?.addEventListener("click",()=>{carouselIndex=(carouselIndex+1)%gallery.length;carouselImage();});
  document.querySelectorAll(".article-body img").forEach(img=>img.addEventListener("click",()=>openLightboxFromSrc(img.src)));
}
function markdownToHtml(md) {
  let s=esc(md);
  // Custom article image blocks are converted first.
  s=s.replace(/&lt;figure class=&quot;article-image&quot;&gt;\s*&lt;img src=&quot;([^&]+)&quot; alt=&quot;([^&]*)&quot;&gt;\s*&lt;figcaption&gt;([\s\S]*?)&lt;\/figcaption&gt;\s*&lt;\/figure&gt;/g,
    '<figure class="article-image"><img src="$1" alt="$2" loading="lazy"><figcaption>$3</figcaption></figure>');
  s=s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) => `<figure class="article-image"><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${title || alt}</figcaption></figure>`);
  s=s.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>");
  s=s.replace(/^> (.*)$/gm,"<blockquote>$1</blockquote>");
  s=s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>");
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s=s.replace(/^- (.*)$/gm,"<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
  return s.split(/\n\s*\n/).map(block=>{
    if(/^<(h2|h3|blockquote|ul|figure)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g,"<br>")}</p>`;
  }).join("");
}
function renderPage(page) {
  const data=state[page];
  $("#app").innerHTML=`<article class="page-card"><h1>${esc(data.title||"")}</h1>${markdownToHtml(data.body||"")}${page==="contact"?`<p><strong>Email:</strong> <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>`:""}</article>`;
}
function route() {
  const hash=location.hash.slice(1)||"/";
  if(hash==="/") return renderHome();
  if(hash==="/about") return renderPage("about");
  if(hash==="/contact") return renderPage("contact");
  if(hash.startsWith("/article/")) return renderArticle(decodeURIComponent(hash.slice(9)));
  renderHome();
}
function openLightbox(i) {
  if(!state.currentGallery.length)return;
  state.galleryIndex=i;
  updateLightbox();
  $("#lightbox").hidden=false;
  document.body.style.overflow="hidden";
}
function openLightboxFromSrc(src) {
  const idx=state.currentGallery.findIndex(g=>new URL(g.image,location.href).href===src);
  if(idx>=0) openLightbox(idx);
}
function updateLightbox() {
  const g=state.currentGallery[state.galleryIndex];
  $("#lightbox-image").src=g.image;
  $("#lightbox-image").alt=g.caption||"";
  $("#lightbox-caption").textContent=g.caption||"";
}
function closeLightbox(){ $("#lightbox").hidden=true; document.body.style.overflow=""; }
$("#lightbox .lightbox-close").onclick=closeLightbox;
$("#lightbox .lightbox-prev").onclick=()=>{state.galleryIndex=(state.galleryIndex-1+state.currentGallery.length)%state.currentGallery.length;updateLightbox()};
$("#lightbox .lightbox-next").onclick=()=>{state.galleryIndex=(state.galleryIndex+1)%state.currentGallery.length;updateLightbox()};
$("#lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeLightbox()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLightbox();if(!$("#lightbox").hidden&&e.key==="ArrowLeft")$("#lightbox .lightbox-prev").click();if(!$("#lightbox").hidden&&e.key==="ArrowRight")$("#lightbox .lightbox-next").click();});
window.addEventListener("hashchange",route);
loadData().catch(err=>{$("#app").innerHTML=`<div class="empty">Nu am putut încărca conținutul site-ului.</div>`;console.error(err)});
