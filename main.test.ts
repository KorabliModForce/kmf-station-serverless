import { versionCompareFn } from './util.ts'
import { assertEquals } from '@std/assert'

Deno.test('compare versions', () => {
  const versions = ['25.4.214123.zh', '25.4.215555.zh']

  assertEquals(versions.sort(versionCompareFn), [
    '25.4.215555.zh',
    '25.4.214123.zh',
  ])
})
