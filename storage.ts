import { createS3StorageProvider } from './storage/s3.ts'

export type StorageProvider = {
  mod: {
    // 上传Mod
    put: (modid: string, version: string, content: Uint8Array) => Promise<void>
    // 获取下载Mod的方式，目前只要求支持URL
    get: (modid: string, version: string) => Promise<URL> | URL
    // 列出模组及版本
    // 版本号排序为降序
    list: (filter?: {
      // 模组ID
      modid?: string
      // 版本选择表达式
      version?: string
    }) => Promise<Record<string, string[]>>
  }
}

export const createStorage = () => {
  return createS3StorageProvider()
}
