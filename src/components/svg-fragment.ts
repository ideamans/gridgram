import { h } from 'preact'
import type { VNode } from 'preact'
import type { SvgFragment } from '../types'

/**
 * Build a `<tag>` element that holds an SvgFragment as its inner content.
 *
 * - string:   embedded as raw markup via dangerouslySetInnerHTML (so the
 *             resolver output — literal `<path>...<circle>` fragments — stays
 *             intact rather than being escaped to text)
 * - VNode / children array: passed as normal children
 * - null/undefined/false: no children
 */
export function hFragment(
  tag: string,
  props: Record<string, unknown>,
  fragment: SvgFragment
): any {
  if (fragment === null || fragment === undefined || fragment === false) {
    return h(tag, props)
  }
  if (typeof fragment === 'string') {
    return h(tag, { ...props, dangerouslySetInnerHTML: { __html: fragment } })
  }
  return h(tag, props, fragment as any)
}
