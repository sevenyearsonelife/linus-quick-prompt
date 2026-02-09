# Linus Prompt

English | [中文](./README.md)

<p align="center">
  <img src="./assets/icon.png" alt="Linus Prompt Logo" width="128" style="background: transparent;">
</p>

Linus Prompt is a browser extension built with WXT for prompt management, quick insertion on web pages, and AI-page question extraction.

## Features

- Trigger prompt selector by typing `/p` in web input fields
- Keyboard shortcuts
  - Open selector: `Ctrl+Shift+P` / `Command+Shift+P`
  - Save selected text as prompt: `Ctrl+Shift+S` / `Command+Shift+S`
- Save selected text via context menu
- Prompt management: enable/disable, pin, drag-and-drop sort, tags, notes, categories
- Variable template support: `{{variable_name}}`
- Popup question extraction for `Google AI Studio` and `AlphaXiv`
- i18n and auto light/dark theme

## Development

```bash
pnpm install
pnpm dev
pnpm dev:firefox
pnpm build
pnpm build:firefox
pnpm zip
pnpm zip:firefox
pnpm compile
```

Optional `.env`:

```bash
WXT_FIREFOX_EXTENSION_ID=quick-prompt@example.com
```

## License

MIT
