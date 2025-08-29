# Drizzle Cube Documentation (Starlight)

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

This is the new Starlight-powered documentation site for Drizzle Cube, migrated from the custom-built help site.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (includes external content sync)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── assets/              # Images and assets
├── content/
│   └── docs/           # Documentation content (Markdown/MDX)
├── styles/
│   └── custom.css      # Custom styling
public/                 # Static assets (images, etc.)
scripts/
├── sync-external-content.js  # Syncs external README files
└── add-frontmatter.js        # Utility to add frontmatter
help-content-config.json      # Configuration for external content
```

## 🔧 Key Features

### Built-in Features (from Starlight)
- ✅ **Built-in search** - Pagefind-powered search
- ✅ **Dark mode** - Automatic theme switching
- ✅ **Responsive navigation** - Mobile-friendly sidebar
- ✅ **SEO optimized** - Proper meta tags and sitemap
- ✅ **Syntax highlighting** - Code blocks with Shiki
- ✅ **Table of contents** - Auto-generated from headings

### Migration Features
- ✅ **External content sync** - Automatically pulls adapter docs and examples
- ✅ **Content structure preserved** - All original content migrated
- ✅ **Asset migration** - All images and assets copied
- ✅ **Navigation maintained** - Same structure as original site

## 📝 Content Management

### Adding New Content
1. Create `.md` files in `src/content/docs/`
2. Add frontmatter with `title` and optional `description`
3. Update navigation in `astro.config.mjs`

### External Content
External content (like adapter READMEs) is automatically synced from:
- `../drizzle-cube/src/adapters/*/README.md`
- `../drizzle-cube-*/README.md` (example projects)

Configure external sources in `help-content-config.json`.

## 🚀 Deployment

The site builds to static HTML and can be deployed anywhere:
- Cloudflare Pages
- Vercel
- Netlify
- GitHub Pages

## 🎨 Customization

### Styling
- Edit `src/styles/custom.css` for custom styles
- Modify theme colors in CSS custom properties

### Configuration
- Main config in `astro.config.mjs`
- Navigation structure defined in sidebar config
- Site metadata and social links

## 🔄 Migration from Original Site

This site was migrated from `drizzle-cube-help-site` with:
- All content preserved (no changes to text)
- Navigation structure maintained
- Assets and images copied
- External content synchronization
- Default Starlight styling (as requested)

## 📚 Documentation

For Starlight documentation: https://starlight.astro.build/
For Astro documentation: https://docs.astro.build/
