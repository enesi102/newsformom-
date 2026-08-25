const state = {
  articles: [],
  categories: [],
  settings: {},
  about: {},
  contact: {},
  category: "all",
  query: "",
  searchMode: "both",
  currentGallery: [],
  galleryIndex: 0
};

const $ = (s) => document.querySelector(s);

async function loadData() {
  const [settings, about, contact, categories, articles] = await Promise.all([
    fetch("/data/settings.json").then(r=>r.json()),
    fetch("/data/about.json").then(r=>r.json()),
    fetch("/data/contact.json").then(r=>r.json()),
    fetch("/data/categories.json").then(r=>r.json()),
    fetch("/data/articles.json").then(r=>r.json())
  ]);
  Object.assign(state, {settings,about,contact,categories,articles});
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
  return safe.replace(re,"<mark class="highlight">$1</mark>");
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
  const filtered = state.articles.filter(a => {
    const catOk = state.category==="all" || a.category===state.category;
    const q = state.query.trim().toLowerCase();
    if (!catOk) return false;
    if (!q) return true;
    const hayTitle = String(a.title||"").toLowerCase();
    const hayBody = plainText(a.body).toLowerCase();
    return state.searchMode==="title" ? hayTitle.includes(q)
      : state.searchMode==="content" ? hayBody.includes(q)
      : hayTitle.includes(q)||hayBody.includes(q);
  });

  $("#app").innerHTML = `
    <section>
      <div class="section-heading">
        <div>
          <h1>Ultimele știri</h1>
          <p class="lead">Informații care merită înțelese, pe scurt și clar.</p>
        </div>
      </div>

      <div class="search-row">
        <input id="search" type="search" placeholder="Caută în titlu și conținut…" value="${esc(state.query)}">
        <select id="search-mode" aria-label="Unde se caută">
          <option value="both" ${state.searchMode==="both"?"selected":""}>Titlu + conținut</option>
          <option value="title" ${state.searchMode==="title"?"selected":""}>Doar titlu</option>
          <option value="content" ${state.searchMode==="content"?"selected":""}>Doar conținut</option>
        </select>
      </div>

      <div class="filters">
        <button class="filter ${state.category==="all"?"active":""}" data-cat="all">Toate</button>
        ${cats.map(c=>`<button class="filter ${state.category===c.slug?"active":""}" data-cat="${esc(c.slug)}">${esc(c.icon||"")} ${esc(c.name)}</button>`).join("")}
      </div>

      <div>
        ${filtered.length ? filtered.map(renderCard).join("") : `<div class="empty">Nu am găsit știri care să corespundă căutării.</div>`}
      </div>
    </section>`;

  $("#search").addEventListener("input", e => { state.query=e.target.value; renderHome(); });
  $("#search-mode").addEventListener("change", e => { state.searchMode=e.target.value; renderHome(); });
  document.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{state.category=b.dataset.cat;renderHome();}));
}
function renderCard(a) {
  const cat=categoryBySlug(a.category);
  const excerpt=plainText(a.body).slice(0,240);
  return `<article class="article-card">
    <div class="meta"><span>${formatDate(a.date)}</span><span>${esc(cat?.icon||"")} ${esc(cat?.name||a.category||"")}</span></div>
    <h2><a href="#/article/${encodeURIComponent(a.slug || slugFromTitle(a.title))}">${highlight(a.title)}</a></h2>
    ${a.tags?.length ? `<div class="tags">${a.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
    <p class="card-excerpt">${highlight(excerpt)}${excerpt.length>=240?"…":""}</p>
  </article>`;
}
function slugFromTitle(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

function renderArticle(id) {
  const a=state.articles.find(x => (x.slug||slugFromTitle(x.title))===id);
  if(!a){ $("#app").innerHTML='<div class="empty">Știrea nu a fost găsită.</div>'; return; }
  const cat=categoryBySlug(a.category);
  const body=markdownToHtml(a.body||"");
  const gallery=a.gallery||[];
  $("#app").innerHTML=`<article class="article">
    <header class="article-header">
      <div class="meta">${formatDate(a.date)} · ${esc(cat?.icon||"")} ${esc(cat?.name||a.category||"")}</div>
      <h1>${esc(a.title)}</h1>
      ${a.tags?.length?`<div class="tags">${a.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div>`:""}
    </header>
    ${a.hero_image?`<figure class="hero-figure"><img src="${esc(a.hero_image)}" alt="${esc(a.hero_caption||a.title)}" loading="eager"><figcaption>${esc(a.hero_caption||"")}</figcaption></figure>`:""}
    <div class="article-body">${body}</div>
    ${a.source_url?`<a class="source" href="${esc(a.source_url)}" target="_blank" rel="noopener noreferrer">Sursa originală ↗</a>`:""}
    ${gallery.length?`<section class="gallery"><h2>Galerie foto</h2><div class="gallery-grid">${gallery.map((g,i)=>`<button class="gallery-item" data-gallery="${i}" aria-label="Deschide fotografia ${i+1}"><img src="${esc(g.image)}" alt="${esc(g.caption||"")}" loading="lazy"></button>`).join("")}</div></section>`:""}
  </article>`;
  state.currentGallery=gallery;
  document.querySelectorAll("[data-gallery]").forEach(b=>b.addEventListener("click",()=>openLightbox(Number(b.dataset.gallery))));
  document.querySelectorAll(".article-body img").forEach(img=>img.addEventListener("click",()=>openLightboxFromSrc(img.src)));
}
function markdownToHtml(md) {
  let s=esc(md);
  // Custom article image blocks are converted first.
  s=s.replace(/&lt;figure class=&quot;article-image&quot;&gt;\s*&lt;img src=&quot;([^&]+)&quot; alt=&quot;([^&]*)&quot;&gt;\s*&lt;figcaption&gt;([\s\S]*?)&lt;\/figcaption&gt;\s*&lt;\/figure&gt;/g,
    '<figure class="article-image"><img src="$1" alt="$2" loading="lazy"><figcaption>$3</figcaption></figure>');
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
