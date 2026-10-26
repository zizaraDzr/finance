#!/usr/bin/env node
// Генерирует локальный сертификат для HTTPS-сервера (server/index.mjs).
//
// selfsigned.crt и selfsigned.key намеренно не хранятся в репозитории: их создаёт
// у себя каждый разработчик. Подробности — в README, раздел «Локальный HTTPS».
//
// Использование:
//   pnpm certs
//   pnpm certs -- --force   # перезаписать существующий сертификат

import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, readdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const certPath = path.join(projectRoot, 'selfsigned.crt')
const keyPath = path.join(projectRoot, 'selfsigned.key')
const hosts = ['localhost', '127.0.0.1', '::1']
const days = process.env.CERT_DAYS || '365'
const force = process.argv.includes('--force')

function hasCommand(command, versionArgs) {
  const result = spawnSync(command, versionArgs, { stdio: 'ignore' })
  return !result.error && result.status === 0
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function generateWithMkcert() {
  console.log('Найден mkcert — генерирую локально доверенный сертификат.')

  const before = new Set(readdirSync(projectRoot))
  run('mkcert', hosts)

  const created = readdirSync(projectRoot).filter(
    name => !before.has(name) && /^localhost\+\d+(-key)?\.pem$/.test(name),
  )
  const certFile = created.find(name => !name.includes('-key'))
  const keyFile = created.find(name => name.includes('-key'))

  if (!certFile || !keyFile) {
    console.error('mkcert отработал, но созданные файлы не найдены. Проверьте каталог проекта вручную.')
    process.exit(1)
  }

  renameSync(path.join(projectRoot, certFile), certPath)
  renameSync(path.join(projectRoot, keyFile), keyPath)

  console.log('Если браузер не доверяет сертификату, выполните один раз: mkcert -install')
}

function generateWithOpenSSL() {
  console.log('Найден openssl — генерирую самоподписанный сертификат.')

  run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:4096',
    '-nodes',
    '-sha256',
    '-days',
    days,
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1',
  ])
}

if (existsSync(certPath) || existsSync(keyPath)) {
  if (!force) {
    console.error(`Сертификат уже существует:\n  ${certPath}\n  ${keyPath}`)
    console.error('Перезаписать: pnpm certs -- --force')
    process.exit(1)
  }

  rmSync(certPath, { force: true })
  rmSync(keyPath, { force: true })
}

if (hasCommand('mkcert', ['-version'])) {
  generateWithMkcert()
} else if (hasCommand('openssl', ['version'])) {
  generateWithOpenSSL()
} else {
  console.error('Не найден ни mkcert, ни openssl — сгенерировать сертификат нечем.')
  console.error('')
  console.error('Вариант 1 (рекомендуется): установите mkcert и повторите pnpm certs')
  console.error('  https://github.com/FiloSottile/mkcert#installation')
  console.error('')
  console.error('Вариант 2: установите OpenSSL (например, вместе с Git for Windows)')
  console.error('  и добавьте его каталог bin в PATH.')
  process.exit(1)
}

// Приватный ключ должен быть доступен только владельцу.
try {
  chmodSync(keyPath, 0o600)
} catch {
  // На Windows и на некоторых ФС chmod ограничен — это не критично.
}

console.log('')
console.log(`Сертификат: ${certPath}`)
console.log(`Ключ:       ${keyPath}`)
console.log('Оба файла в .gitignore — коммитить их не нужно.')
