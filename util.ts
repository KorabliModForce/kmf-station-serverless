// @ts-types="@types/semver"
import { gt as semverGt, eq as semverEq, valid as semverValid } from 'semver'

export const MAYBE_VERSION_REGEX = /^(([0-9]+)[.-])*([0-9]+)([.-].*[^.-])?$/
const VERSION_NUMBER_SPLIT_REGEX = /[.-]/
const ALPHA_PREFIX_OR_SUFFIX_REGEX = /(^[^0-9]+)|([^0-9]+$)/

/** 降序排序版本号 */
export const versionCompareFn = (a_: string, b_: string) => {
  // 去除无用前缀
  const [a, b] = [a_.replace(/^v/, ''), b_.replace(/^v/, '')]
  console.debug('Is', a, 'a version?', MAYBE_VERSION_REGEX.test(a))
  console.debug('Is', b, 'a version?', MAYBE_VERSION_REGEX.test(b))
  if (semverValid(a) && semverValid(b)) {
    // 语义化版本号当然是最好的
    console.debug('semver', a, b)
    if (semverGt(a, b)) {
      return -1
    } else if (semverEq(a, b)) {
      return 0
    } else {
      return 1
    }
  } else if (MAYBE_VERSION_REGEX.test(a) && MAYBE_VERSION_REGEX.test(b)) {
    // 差不多也许是个版本号，只关注数字上的差异
    const aNums = a
      .split(VERSION_NUMBER_SPLIT_REGEX)
      .map(x => x.replace(ALPHA_PREFIX_OR_SUFFIX_REGEX, ''))
      .filter(x => x != '')
    const bNums = b
      .split(VERSION_NUMBER_SPLIT_REGEX)
      .map(x => x.replace(ALPHA_PREFIX_OR_SUFFIX_REGEX, ''))
      .filter(x => x != '')
    console.debug(aNums, 'vs', bNums)
    for (const i of Array(Math.min(aNums.length, bNums.length)).keys()) {
      if (aNums[i] > bNums[i]) {
        console.debug(aNums, '>', bNums)
        return -1
      } else if (aNums[i] < bNums[i]) {
        console.debug(aNums, '<', bNums)
        return 1
      }
    }
    return 0
  } else {
    // 我们不能辨别这种版本号的差异，所以保持现状好了
    console.warn('unrecognized version diff:', a, b)
    return 0
  }
}
