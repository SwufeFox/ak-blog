import { fromHtml } from 'hast-util-from-html'
import { sanitize, defaultSchema } from 'hast-util-sanitize'
import { toHtml } from 'hast-util-to-html'
import type { Element, ElementContent, Root } from 'hast'

const SVG_ELEMENTS = [
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'marker', 'linearGradient', 'radialGradient', 'stop', 'clipPath',
]

const SVG_ATTRIBUTES = [
  'id', 'className', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'points', 'd', 'transform', 'fill', 'fillOpacity',
  'fillRule', 'stroke', 'strokeWidth', 'strokeOpacity', 'strokeLinecap', 'strokeLinejoin',
  'strokeDasharray', 'strokeDashoffset', 'opacity', 'vectorEffect', 'markerStart', 'markerMid',
  'markerEnd', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'gradientUnits',
  'gradientTransform', 'offset', 'stopColor', 'stopOpacity', 'clipPathUnits', 'clipPath',
  'href', 'xLinkHref', 'textAnchor', 'dominantBaseline', 'role', 'ariaLabel', 'ariaLabelledBy',
  'ariaHidden',
]

const SAFE_ID = /^[A-Za-z_][\w.:-]*$/
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?%?$/
const NUMBER_LIST = /^[\d\s,+.eE-]+%?$/
const PATH_DATA = /^[\d\s,.;a-zA-Z+\-]+$/
const TRANSFORM = /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([\d\s,+.eE-]+\)\s*)+$/
const COLOR = /^(?:none|currentColor|transparent|[A-Za-z]+|#[\da-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,+/-]+\)|var\(--[\w-]+\))$/
const LOCAL_URL = /^url\(\s*#([A-Za-z_][\w.:-]*)\s*\)$/

function isElement(node: ElementContent): node is Element {
  return node.type === 'element'
}

function safeValue(name: string, value: unknown): boolean {
  if (name === 'className' && Array.isArray(value)) {
    return value.every((item) => typeof item === 'string' && /^[\w-]+$/.test(item))
  }
  if (typeof value !== 'string') return false
  if (name === 'id') return SAFE_ID.test(value)
  if (name === 'className') return value.split(/\s+/).every((item) => /^[\w-]+$/.test(item))
  if (name === 'href' || name === 'xLinkHref') return value.startsWith('#') && SAFE_ID.test(value.slice(1))
  if (name === 'markerStart' || name === 'markerMid' || name === 'markerEnd' || name === 'clipPath') {
    return value === 'none' || LOCAL_URL.test(value)
  }
  if (name === 'fill' || name === 'stroke' || name === 'stopColor') {
    return COLOR.test(value) || LOCAL_URL.test(value)
  }
  if (name === 'd') return PATH_DATA.test(value)
  if (name === 'points' || name === 'viewBox' || name === 'strokeDasharray') return NUMBER_LIST.test(value)
  if (name === 'transform' || name === 'gradientTransform') return TRANSFORM.test(value)
  if (name === 'orient') return value === 'auto' || value === 'auto-start-reverse' || NUMBER.test(value)
  if (name === 'strokeLinecap') return value === 'butt' || value === 'round' || value === 'square'
  if (name === 'strokeLinejoin') return value === 'miter' || value === 'round' || value === 'bevel'
  if (name === 'fillRule') return value === 'nonzero' || value === 'evenodd'
  if (name === 'vectorEffect') return value === 'none' || value === 'non-scaling-stroke'
  if (name === 'gradientUnits' || name === 'clipPathUnits') return value === 'objectBoundingBox' || value === 'userSpaceOnUse'
  if (name === 'offset') return NUMBER.test(value)
  if (name === 'textAnchor') return value === 'start' || value === 'middle' || value === 'end'
  if (name === 'dominantBaseline') return /^[a-z-]+$/.test(value)
  if (name.startsWith('aria') || name === 'role') return !/[<>]/.test(value)
  return NUMBER.test(value)
}

function sanitizeNode(node: Element): boolean {
  if (!SVG_ELEMENTS.includes(node.tagName)) return false
  for (const name of Object.keys(node.properties)) {
    if (!SVG_ATTRIBUTES.includes(name) || !safeValue(name, node.properties[name])) {
      delete node.properties[name]
    }
  }
  node.children = node.children.filter((child) => {
    if (child.type === 'text') return true
    if (!isElement(child)) return false
    return sanitizeNode(child)
  })
  return true
}

/** Parse sketch markup as HTML/SVG, keep its small drawing-only subset, and serialize safely. */
export function sanitizeSketchSvg(source: string): string {
  const parsed = fromHtml(source, { fragment: true }) as Root
  const sourceSvg = parsed.children.find(
    (node): node is Element => node.type === 'element' && node.tagName === 'svg',
  )
  if (!sourceSvg || !sanitizeNode(sourceSvg)) return ''
  parsed.children = [sourceSvg]

  const tree = sanitize(parsed, {
    ...defaultSchema,
    tagNames: SVG_ELEMENTS,
    attributes: { '*': SVG_ATTRIBUTES },
    clobber: [],
  }) as Root
  const svg = tree.children.find((node): node is Element => node.type === 'element' && node.tagName === 'svg')
  if (!svg || !sanitizeNode(svg)) return ''
  tree.children = [svg]

  const descendants = [svg]
  let needsArrow = false
  let hasArrow = false
  while (descendants.length > 0) {
    const element = descendants.pop()!
    needsArrow ||= element.properties.markerEnd === 'url(#arrow)'
    hasArrow ||= element.properties.id === 'arrow'
    descendants.push(...element.children.filter(isElement))
  }
  if (needsArrow && !hasArrow) {
    const marker = fromHtml(
      '<svg><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="ak-arrowhead" d="M0 0 L10 5 L0 10"/></marker></defs></svg>',
      { fragment: true },
    ).children[0]
    if (marker?.type === 'element') svg.children.unshift(...marker.children)
  }

  return toHtml(tree, { characterReferences: { useNamedReferences: true } })
}
