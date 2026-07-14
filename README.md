# finance

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

## Offline-first и синхронизация

Приложение хранит рабочие данные в IndexedDB. `default.json` используется как стартовый набор данных, если на устройстве еще нет локальной базы и локальный сервер недоступен.

Для локальной синхронизации:

1. Скопируйте `.env.example` в `.env`.
2. Поставьте одинаковый токен в `SYNC_TOKEN` и `VITE_SYNC_TOKEN`.
3. Запустите локальный сервер:

```sh
pnpm server
```

Сервер:

- отдает `GET /api/finance-data`;
- принимает `PUT /api/finance-data`;
- хранит актуальную копию в `data/finance-data.json`;
- не перезаписывает более свежую серверную копию устаревшими локальными данными.

Кнопка "Синхронизировать" сравнивает `updatedAt` локальной IndexedDB и серверной копии. Более свежая сторона становится источником истины.
