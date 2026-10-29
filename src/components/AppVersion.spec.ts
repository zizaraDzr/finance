import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppVersion from '@/components/AppVersion.vue'
import packageJson from '../../package.json'

describe('AppVersion', () => {
  it('shows the version from package.json', () => {
    const wrapper = mount(AppVersion)

    expect(wrapper.text()).toBe(`v${packageJson.version}`)
  })
})
