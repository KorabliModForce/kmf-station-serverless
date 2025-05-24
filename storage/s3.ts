import { StorageProvider } from '../storage.ts'
import {
  _Object,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@^3.802.0'
import { StreamingBlobPayloadInputTypes } from 'npm:@smithy/types@^4.2.0'
// @ts-types="npm:@types/semver@^7.7.0"
import {
  gt as semverGt,
  eq as semverEq,
  valid as semverValid,
} from 'npm:semver@^7.7.1'

const S3_ENDPOINT = Deno.env.get('S3_ENDPOINT')
if (!S3_ENDPOINT) {
  throw new Error('S3_ENDPOINT must be specified')
}

const S3_ACCESS_KEY_ID = Deno.env.get('S3_ACCESS_KEY_ID')
if (!S3_ACCESS_KEY_ID) {
  throw new Error('S3_ACCESS_KEY_ID must be specified')
}

const S3_SECRET_ACCESS_KEY = Deno.env.get('S3_SECRET_ACCESS_KEY')
if (!S3_SECRET_ACCESS_KEY) {
  throw new Error('S3_SECRET_ACCESS_KEY must be specified')
}

const S3_BUCKET = Deno.env.get('S3_BUCKET')
if (!S3_BUCKET) {
  throw new Error('S3_BUCKET must be specified')
}

const S3_PUBLIC_URL_BASE = Deno.env.get('S3_PUBLIC_URL_BASE')
if (!S3_PUBLIC_URL_BASE) {
  throw new Error('S3_PUBLIC_URL_BASE must be specified')
}

export const MAYBE_VERSION_REGEX = /^(([0-9]+)[.-])*([0-9]+)([.-].*[^.-])?$/
const VERSION_NUMBER_SPLIT_REGEX = /[.-]/
const ALPHA_PREFIX_OR_SUFFIX_REGEX = /(^[^0-9]+)|([^0-9]+$)/

export const createS3StorageProvider = (): StorageProvider => {
  const client = new S3Client({
    region: 'auto',
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  })

  const putFile = async (
    key: string,
    body: StreamingBlobPayloadInputTypes,
    acl: ObjectCannedACL
  ) => {
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ACL: acl,
      })
    )
  }

  const getFileUrl = (key: string) => {
    return new URL(`${S3_PUBLIC_URL_BASE}/${key}`)
  }

  const cachedFileList: _Object[] = []
  let lastCached = 0

  const listFileWithPrefix = async (prefix: string): Promise<_Object[]> => {
    if (Date.now() - lastCached < 60000) {
      return cachedFileList.filter(x => x.Key?.startsWith(prefix))
    } else {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: S3_BUCKET,
        })
      )
      lastCached = Date.now()
      if (result.Contents) {
        cachedFileList.splice(0, cachedFileList.length)
        cachedFileList.push(...result.Contents)
        console.debug(cachedFileList)
        return cachedFileList.filter(x => x.Key?.startsWith(prefix))
      } else {
        cachedFileList.splice(0, cachedFileList.length)
        console.debug(cachedFileList)
        return []
      }
    }
  }

  return {
    mod: {
      get: (modid, version) => {
        return getFileUrl(`mod/${modid}/${version}/archive.zip`)
      },
      put: async (modid, version, content) => {
        putFile(`mod/${modid}/${version}/archive.zip`, content, 'public-read')
      },
      list: async filter => {
        const result: Record<string, string[]> = {}
        const contents = await listFileWithPrefix(`mod/${filter?.modid || ''}`)
        for (const content of contents) {
          if (content.Key) {
            const exec = /^mod\/([^/]+)\/([^/]+)\/archive.zip$/.exec(
              content.Key
            )
            if (exec) {
              const modid = exec[1]
              const version = exec[2]
              if (!(modid in result)) {
                result[modid] = [version]
              } else {
                result[modid] = result[modid].concat(version)
              }
              result[modid].sort((a_, b_) => {
                // 去除无用前缀
                const [a, b] = [a_.replace(/^v/, ''), b_.replace(/^v/, '')]
                console.debug(
                  'Is',
                  a,
                  'a version?',
                  MAYBE_VERSION_REGEX.test(a)
                )
                console.debug(
                  'Is',
                  b,
                  'a version?',
                  MAYBE_VERSION_REGEX.test(b)
                )
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
                } else if (
                  MAYBE_VERSION_REGEX.test(a) &&
                  MAYBE_VERSION_REGEX.test(b)
                ) {
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
                  for (const i of Array(
                    Math.min(aNums.length, bNums.length)
                  ).keys()) {
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
              })
            }
          }
        }
        return result
      },
    },
  }
}
