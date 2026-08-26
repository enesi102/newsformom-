# NewsForMom

NewsForMom is a static editorial website powered by GitHub content and Pages CMS. It keeps a simple Git-based publishing workflow, stores all content as JSON, and builds a fully static public site that can be hosted on Cloudflare Pages or any other static host.

## Architecture

The site follows this flow:

GitHub repository
  ↓
Pages CMS editor
  ↓
GitHub commit with JSON content and media
  ↓
Cloudflare Pages build
  ↓
static dist/ output
  ↓
public website

This keeps the project portable, cheap to host, and independent from Netlify-specific services.

## Repository structure

- `content/news/` — article files in JSON format
- `content/categories/` — category definitions and metadata
- `content/pages/` — About and Contact page data
- `content/site/settings.json` — site banner configuration
- `media/` — uploaded images used by articles and galleries
- `src/` — frontend HTML, CSS, and JavaScript
- `scripts/build.js` — static build script that assembles `dist/`
- `.pages.yml` — Pages CMS configuration
- `package.json` — build scripts and project metadata

## Local development

Use Node 20 locally to match the project requirement and avoid engine warnings.

If you use nvm:

```bash
nvm install 20
nvm use 20
```

Then install dependencies and build the site:

```bash
npm install
npm run build
```

After the build, the generated output is in `dist/`.

You can preview the generated site locally with any simple static file server, for example:

```bash
npx serve dist
```

or by serving the folder with a static host or local HTTP server.

## CMS workflow

The editor is Pages CMS, accessed via the Pages CMS app. It commits content changes directly to GitHub, and GitHub remains the source of truth.

The content model remains JSON-based:

- articles are stored in `content/news/*.json`
- categories are stored in `content/categories/*.json`
- pages are stored in `content/pages/*.json`
- site settings are stored in `content/site/settings.json`
- media files are stored in `media/`

This keeps the content portable and avoids any database or server-side application.

## Build output

The build script creates a fully static site in `dist/` and includes:

- `dist/index.html`
- `dist/app.js`
- `dist/styles.css`
- `dist/data/*.json`
- `dist/media/*`

The frontend reads the generated JSON files and renders the public pages without any server runtime.

## Cloudflare Pages deployment

Use the following Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20`

This is the normal static deployment flow:

GitHub
  ↓
Cloudflare Pages
  ↓
`npm run build`
  ↓
`dist/`
  ↓
public website

No server-rendered app, database, or persistent backend is required.

## Custom domain setup

To connect a custom domain:

1. Create a Cloudflare Pages project connected to the GitHub repository.
2. Choose the production branch (for example `main`).
3. Set the build command to `npm run build` and output directory to `dist`.
4. In Cloudflare, add the custom domain in the Pages project settings.
5. Configure the DNS records in Cloudflare for the domain.
6. Let Cloudflare manage HTTPS automatically.

The domain registration itself is separate from hosting; Cloudflare Pages hosting can be free while the domain may still be paid via a registrar.

## Portability

The generated site remains static and portable. It is not tied to Cloudflare-specific runtime code or APIs. It can later be deployed to another static host such as GitHub Pages, Netlify, or another CDN-backed static host without redesigning the content model.

## Notes

- Keep content in GitHub as the single source of truth.
- Do not store secrets in the repository.
- The public site remains static and should be compatible with a normal static host.
- Images are kept in `media/` and are copied into the build output.
