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

### Run unit tests with [Vitest](https://vitest.dev/)

```sh
pnpm test
```

Для режима наблюдения:

```sh
pnpm test:watch
```

## Локальный HTTPS

`pnpm server` поднимает HTTPS, поэтому ему нужны `selfsigned.crt` и `selfsigned.key` в корне проекта. Эти файлы **не хранятся в репозитории** — они генерируются локально у каждого разработчика:

```sh
pnpm certs
```

Скрипт использует `mkcert`, если он установлен (рекомендуется: сертификат сразу доверенный — без предупреждений браузера и с работающим service worker), иначе откатывается на `openssl`. Перезаписать существующий сертификат:

```sh
pnpm certs -- --force
```

Пути можно переопределить переменными `TLS_KEY_PATH` и `TLS_CERT_PATH` в `.env`.

Приватные ключи (`*.key`, `*.pem`, `*.p12`, `*.pfx`, `*.jks`) в репозиторий не коммитятся. Попав в историю git, файл остаётся доступным даже после удаления: историю пришлось бы переписывать через `git filter-repo`, а ключ — считать скомпрометированным и перевыпускать.

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
pnpm build
node server/index.mjs

- отдает `GET /api/finance-data`;
- принимает `PUT /api/finance-data`;
- хранит актуальную копию в `data/finance-data.json`;
- перед каждой перезаписью кладет рядом `data/finance-data.backup.<время>.json` и хранит последние 10 копий (`BACKUP_LIMIT`);
- отправляет свежий снимок на Яндекс Диск по REST API, если задан `YANDEX_OAUTH_TOKEN` (папка `YANDEX_BACKUP_PATH`, по умолчанию `Documents/finance_backup`, хранятся последние `YANDEX_BACKUP_LIMIT` копий);
- не перезаписывает более свежую серверную копию устаревшими локальными данными.

Кнопка "Синхронизировать" сравнивает `updatedAt` локальной IndexedDB и серверной копии. Более свежая сторона становится источником истины.
