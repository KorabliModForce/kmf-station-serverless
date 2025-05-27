import { StorageProvider } from '../storage.ts'
import {
  _Object,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { StreamingBlobPayloadInputTypes } from '@smithy/types'
import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_PUBLIC_URL_BASE,
  S3_SECRET_ACCESS_KEY,
} from '../env.ts'
import { versionCompareFn } from '../util.ts'

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
              result[modid].sort(versionCompareFn)
            }
          }
        }
        return result
      },
    },
  }
}
