import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardActions from './CardActions.vue'

describe('CardActions', () => {
  it('renders Pin button when isPinned is false', () => {
    const wrapper = mount(CardActions, { props: { isPinned: false } })

    expect(wrapper.get('[data-test="pin-btn"]').text()).toBe('Pin')
  })

  it('renders Unpin button when isPinned is true', () => {
    const wrapper = mount(CardActions, { props: { isPinned: true } })

    expect(wrapper.get('[data-test="pin-btn"]').text()).toBe('Unpin')
  })

  it('hides retry button by default', () => {
    const wrapper = mount(CardActions)

    expect(wrapper.find('[data-test="retry-btn"]').exists()).toBe(false)
  })

  it('shows retry button when showRetry is true', () => {
    const wrapper = mount(CardActions, { props: { showRetry: true } })

    expect(wrapper.find('[data-test="retry-btn"]').exists()).toBe(true)
  })

  it('always shows details button', () => {
    const wrapper = mount(CardActions)

    expect(wrapper.get('[data-test="details-btn"]').text()).toBe('Details')
  })

  it.each([
    ['pin-btn', 'pin'],
    ['details-btn', 'details'],
  ] as const)('emits "%s" event when %s button is clicked', async (selector, eventName) => {
    const wrapper = mount(CardActions)

    await wrapper.get(`[data-test="${selector}"]`).trigger('click')

    expect(wrapper.emitted(eventName)).toHaveLength(1)
  })

  it('emits retry event when retry button is clicked', async () => {
    const wrapper = mount(CardActions, { props: { showRetry: true } })

    await wrapper.get('[data-test="retry-btn"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
