const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copy(src, dest) {
  ensure(path.dirname(dest));
  fs.copyFileSync(src, dest);
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
function slug(s) {
  return String(s || "image")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "image";
}
function mimeExt(mime) {
  return ({ "image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif" })[mime] || "bin";
}
function extractDataImages(value, articleSlug) {
  if (typeof value === "string") {
    const re = /data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)/g;
    return value.replace(re, (_, mime, base64) => {
      const dir = path.join(OUT, "media", "news");
      ensure(dir);
      const filename = `${articleSlug}-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${mimeExt(mime)}`;
      fs.writeFileSync(path.join(dir, filename), Buffer.from(base64, "base64"));
      return `/media/news/${filename}`;
    });
  }
  if (Array.isArray(value)) return value.map(v => extractDataImages(v, articleSlug));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k,v] of Object.entries(value)) out[k] = extractDataImages(v, articleSlug);
    return out;
  }
  return value;
}

fs.rmSync(OUT, { recursive:true, force:true });
ensure(OUT);

copy(path.join(ROOT,"src/index.html"), path.join(OUT,"index.html"));
copy(path.join(ROOT,"src/style.css"), path.join(OUT,"styles.css"));
copy(path.join(ROOT,"src/app.js"), path.join(OUT,"app.js"));
copy(path.join(ROOT,"admin/index.html"), path.join(OUT,"admin/index.html"));
copy(path.join(ROOT,"admin/config.yml"), path.join(OUT,"admin/config.yml"));
copy(path.join(ROOT,"admin/editor-components.js"), path.join(OUT,"admin/editor-components.js"));

const settings = readJson(path.join(ROOT,"content/site/settings.json"));
const about = readJson(path.join(ROOT,"content/pages/about.json"));
const contact = readJson(path.join(ROOT,"content/pages/contact.json"));

const categories = walk(path.join(ROOT,"content/categories"))
  .filter(f => f.endsWith(".json")).map(readJson);

const articles = walk(path.join(ROOT,"content/news"))
  .filter(f => f.endsWith(".json"))
  .map(file => {
    const raw = readJson(file);
    const articleSlug = slug(raw.title || path.basename(file, ".json"));
    return extractDataImages(raw, articleSlug);
  })
  .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

ensure(path.join(OUT,"data"));
fs.writeFileSync(path.join(OUT,"data/settings.json"), JSON.stringify(settings,null,2));
fs.writeFileSync(path.join(OUT,"data/about.json"), JSON.stringify(about,null,2));
fs.writeFileSync(path.join(OUT,"data/contact.json"), JSON.stringify(contact,null,2));
fs.writeFileSync(path.join(OUT,"data/categories.json"), JSON.stringify(categories,null,2));
fs.writeFileSync(path.join(OUT,"data/articles.json"), JSON.stringify(articles,null,2));

for (const file of walk(path.join(ROOT,"media"))) {
  const rel = path.relative(path.join(ROOT,"media"), file);
  copy(file, path.join(OUT,"media",rel));
}

console.log(`Built ${articles.length} articles and ${categories.length} categories.`);
