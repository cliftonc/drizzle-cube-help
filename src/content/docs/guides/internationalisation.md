---
title: Internationalisation (i18n)
description: How to configure locale support, provide translations, and contribute new languages to drizzle-cube
---

drizzle-cube ships with built-in internationalisation. All UI text — labels, descriptions, tooltips, empty states, validation messages — is translatable. The default locale is **en-GB** (British English), with **en-US** and **nl-NL** (Dutch) included out of the box.

## Setting the Locale

Pass the `locale` prop to `CubeProvider`:

```tsx
import { CubeProvider } from 'drizzle-cube/client'

function App() {
  return (
    <CubeProvider
      apiUrl="/cubejs-api/v1"
      locale="nl-NL"
    >
      {/* All drizzle-cube components will render in Dutch */}
    </CubeProvider>
  )
}
```

### Bundled Locales

| Code | Language | Notes |
|------|----------|-------|
| `en-GB` | English (British) | Default. Statically bundled — always available with zero latency. |
| `en-US` | English (American) | Overrides ~30 British spellings (colour → color, visualise → visualize). |
| `nl-NL` | Dutch | Full translation. Lazy-loaded as a separate chunk. |

Only the active locale is fetched at runtime. Non-default locales are loaded via dynamic import, so they don't increase your initial bundle size.

### Shortcodes

For convenience, `en` is treated as `en-GB` and `nl` as `nl-NL`.

## No Auto-Detection

drizzle-cube **does not** automatically detect the browser locale or read the `Accept-Language` header. Locale selection is entirely up to your application. This is by design — as an embeddable library, drizzle-cube defers to the host application for locale policy.

Your app can detect the locale however you prefer and pass it through:

```tsx
// Example: use the browser's preferred language
const locale = navigator.language // e.g. 'nl-NL', 'en-US'

<CubeProvider apiUrl="/cubejs-api/v1" locale={locale}>
  ...
</CubeProvider>
```

```tsx
// Example: use a user preference from your settings
const { locale } = useUserSettings()

<CubeProvider apiUrl="/cubejs-api/v1" locale={locale}>
  ...
</CubeProvider>
```

## Changing Locale Dynamically

You can change the locale at any time by updating the `locale` prop — no remount required. The `I18nProvider` inside `CubeProvider` detects the prop change, loads the new locale asynchronously, and re-renders all components with the updated translations.

```tsx
function App() {
  const [locale, setLocale] = useState('en-GB')

  return (
    <>
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        <option value="en-GB">English (UK)</option>
        <option value="en-US">English (US)</option>
        <option value="nl-NL">Nederlands</option>
      </select>

      <CubeProvider apiUrl="/cubejs-api/v1" locale={locale}>
        ...
      </CubeProvider>
    </>
  )
}
```

While the new locale loads (typically <100ms), the UI continues to display the previous locale's text — there is no loading spinner or flash of translation keys.

## Custom Translation Overrides

You can override any translation key or provide entirely custom translations via the `translations` prop:

```tsx
<CubeProvider
  apiUrl="/cubejs-api/v1"
  locale="en-GB"
  translations={{
    'common.actions.save': 'Store',
    'chart.bar.label': 'Column Chart',
  }}
>
  ...
</CubeProvider>
```

Overrides are merged on top of the loaded locale, so you only need to specify the keys you want to change.

## Server-Side Locale

When a locale is set on `CubeProvider`, API requests include an `X-DC-Locale` header automatically. On the server side, this locale is available in `securityContext.locale`, which you can use in cube definitions:

```ts
const ordersCube = defineCube({
  // ...
  measures: {
    statusLabel: {
      sql: (sc) => sc.locale === 'nl-NL'
        ? sql`'Besteld'`
        : sql`'Ordered'`,
      type: 'string',
    },
  },
})
```

## Translation Management

Translations are managed via [Crowdin](https://crowdin.com/), a collaborative translation platform.

### Workflow

1. **Source of truth**: `src/i18n/locales/en.json` contains all English (en-GB) keys (~1,600 strings)
2. **Push to Crowdin**: `npm run i18n:push` uploads the source file and any existing translations
3. **Translate on Crowdin**: Translators work in the Crowdin web UI with context, suggestions, and translation memory
4. **Pull from Crowdin**: `npm run i18n:pull` downloads completed translations into locale files

### File Structure

```
src/i18n/locales/
  en.json        # Source of truth (en-GB)
  en-US.json     # American English overrides
  nl-NL.json     # Dutch (full translation)
```

New locale files are automatically picked up by the dynamic import system — no code changes needed beyond adding the JSON file.

## Crowdin In-Context Editor

For translators, drizzle-cube supports [Crowdin's In-Context editor](https://crowdin.com/page/in-context-localization) — a live overlay that lets you click on any string in the running application and translate it directly, with full visual context.

### How It Works

The dev site includes a **Crowdin In-Context** option in the language dropdown. When selected:

1. The app switches to the `af-ZA` pseudo-locale, which contains Crowdin identifier strings instead of real text
2. The Crowdin JIPT (Just-In-Place Translation) script loads and recognises the identifiers
3. A translation toolbar appears — every translatable string on the page becomes clickable
4. Clicking a string opens the Crowdin editor inline, where you can translate with suggestions, glossary, and translation memory

### Using In-Context

The dev site (`npm run dev`) handles everything automatically. Select **Crowdin In-Context** from the language dropdown — the Crowdin JIPT script loads, the pseudo-locale activates, and the translation overlay appears. Select any other language to exit.

You must be logged into your Crowdin account for the editor to work. If you're not authenticated, the JIPT overlay will prompt you to log in. Contact the project maintainers to get a Crowdin account with access to the drizzle-cube project.

## Contributing a New Language

We welcome translation contributions! To add support for a new language:

1. **Open an issue** on the [drizzle-cube GitHub repository](https://github.com/cliftonc/drizzle-cube/issues/new?title=i18n:%20Add%20%5Blanguage%5D%20translation&labels=i18n&body=I%27d%20like%20to%20contribute%20a%20translation%20for%20%5Blanguage%5D.) requesting to contribute the translation
2. We'll create a Crowdin account for you and add the target language to the project
3. Translate strings in the Crowdin web interface — it provides suggestions, glossary, and context for each string
4. Once the translation reaches sufficient coverage, we'll pull it into the repository and include it in the next release

### Translation Tips

- **Context matters** — many keys include descriptions in Crowdin to clarify where the string appears
- **Keep it concise** — UI labels should be short; tooltips and descriptions can be longer
- **Preserve placeholders** — strings like `Cube '{cubeName}' not found` use `{variable}` placeholders that must be kept as-is
- **British English base** — the source strings use British English (colour, visualise); translate from these, not from the en-US overrides
