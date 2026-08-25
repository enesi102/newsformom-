# NewsForMom

A small, portable, Git-based editorial website.

## Architecture

- GitHub is the source of truth for articles, pages, categories and media.
- Decap CMS provides the editor UI.
- The public site is static HTML/CSS/JavaScript.
- `npm run build` creates `dist/`, containing only static files.
- The site can be hosted on Cloudflare Pages, GitHub Pages, Netlify, or another static host.

## Content

- `content/news/` — article JSON files.
- `content/site/settings.json` — editable site banner.
- `content/categories/` — category name, icon and definition.
- `content/pages/` — About and Contact.
- `media/` — uploaded images.

## Admin

`/admin/` is powered by Decap CMS.

The current authentication uses Netlify Identity + Git Gateway because that is the setup already working for this project. The content itself is not stored in Netlify; it is committed to GitHub.

## Images

Normal uploads use Decap's image widget and are stored under `media/`.

The custom article-image component also accepts an image pasted from the clipboard. Because Decap's documented custom-widget API does not provide a stable public method for uploading a pasted File into its media library, pasted images are temporarily stored as data URLs in the article content and extracted into `/media/news/` during the build. Keep pasted images reasonably sized (preferably screenshots/photos under ~2 MB).

For a future version, this can be replaced by a small authenticated upload endpoint without changing the article format or public site.

## Build

```bash
npm run build
```

Publish `dist/`.

## Important

Do not put GitHub tokens or other secrets in this repository.
