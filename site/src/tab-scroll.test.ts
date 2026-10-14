import { expect, it } from 'vitest'
import { tabScrollEdges } from './tab-scroll'

it('shows only the edges with additional scrollable tabs', () => {
  expect(tabScrollEdges(0, 342, 368)).toEqual({ left: false, right: true })
  expect(tabScrollEdges(10, 342, 368)).toEqual({ left: true, right: true })
  expect(tabScrollEdges(26, 342, 368)).toEqual({ left: true, right: false })
  expect(tabScrollEdges(0, 500, 368)).toEqual({ left: false, right: false })
  expect(tabScrollEdges(0, 342, 342.5)).toEqual({ left: false, right: false })
})
