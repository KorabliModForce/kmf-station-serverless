export const S3_ENDPOINT = Deno.env.get('S3_ENDPOINT') || ''
if (!S3_ENDPOINT) {
  console.warn('S3_ENDPOINT is not specified')
}

export const S3_ACCESS_KEY_ID = Deno.env.get('S3_ACCESS_KEY_ID') || ''
if (!S3_ACCESS_KEY_ID) {
  console.warn('S3_ACCESS_KEY_ID is not specified')
}

export const S3_SECRET_ACCESS_KEY = Deno.env.get('S3_SECRET_ACCESS_KEY') || ''
if (!S3_SECRET_ACCESS_KEY) {
  console.warn('S3_SECRET_ACCESS_KEY is not specified')
}

export const S3_BUCKET = Deno.env.get('S3_BUCKET') || ''
if (!S3_BUCKET) {
  console.warn('S3_BUCKET is not specified')
}

export const S3_PUBLIC_URL_BASE = Deno.env.get('S3_PUBLIC_URL_BASE') || ''
if (!S3_PUBLIC_URL_BASE) {
  console.warn('S3_PUBLIC_URL_BASE is not specified')
}

export const SECRET = Deno.env.get('SECRET')
if (!SECRET) {
  console.warn('SECRET is not specified')
}
