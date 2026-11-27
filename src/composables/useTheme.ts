import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

const storageKey = 'finance-theme'
const theme = ref<Theme>('light')

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(storageKey)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function applyTheme(value: Theme) {
  theme.value = value

  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  meta?.setAttribute('content', value === 'dark' ? '#101210' : '#f4f2ec')
}

function setTheme(value: Theme) {
  applyTheme(value)

  try {
    localStorage.setItem(storageKey, value)
  } catch {
    // Private browsing can reject writes; the theme still applies for this session.
  }
}

function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

// The inline script in index.html has already painted the right theme; mirror it
// into the reactive state and start following the system when the user has no
// explicit preference yet.
const initialTheme = readStoredTheme() ?? (prefersDark() ? 'dark' : 'light')
applyTheme(initialTheme)

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!readStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light')
    }
  })
}

export function useTheme() {
  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme,
  }
}
