import type { RouterScrollBehavior } from 'vue-router'

/**
 * A filter changes only the query of the current page, so the browser must keep
 * its place instead of jumping back to the top of the page.
 */
export const resolveScrollPosition: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition) {
    return savedPosition
  }

  return to.path === from.path ? false : { top: 0 }
}
