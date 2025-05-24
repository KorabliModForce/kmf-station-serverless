import { OpenAPIHono, createRoute, z } from 'npm:@hono/zod-openapi@^0.19.6'
import { cors } from 'npm:hono@^4.7.8/cors'
import { bearerAuth } from 'npm:hono@^4.7.8/bearer-auth'
import { SECRET } from './secret.ts'
import { swaggerUI } from 'npm:@hono/swagger-ui@^0.5.1'
import { createStorage } from './storage.ts'
import { MAYBE_VERSION_REGEX } from './storage/s3.ts'

const app = new OpenAPIHono()

const storage = createStorage()

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
})

app.use(
  cors({
    origin: '*',
    allowMethods: ['GET'],
  })
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/mod/{id}/{version}',
    request: {
      params: z.object({
        id: z.string().openapi('Mod ID'),
        version: z.string().openapi('Mod version'),
      }),
    },
    responses: {
      302: {
        description: 'Mod download',
        headers: z.object({
          location: z.string().openapi({
            description: 'Mod download',
            format: 'uri',
          }),
        }),
      },
      404: {
        description: 'Mod not found',
      },
    },
  }),
  async c => {
    const { id, version } = c.req.valid('param')
    if (version == 'latest') {
      const latestVersion = (await storage.mod.list({ modid: id }))[id].shift()
      if (latestVersion) {
        return c.redirect(await storage.mod.get(id, latestVersion))
      }
      return c.notFound()
    }
    return c.redirect(await storage.mod.get(id, version))
  }
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/mod/{id}/{version}',
    middleware: [bearerAuth({ token: SECRET! })],
    security: [
      {
        Bearer: [],
      },
    ],
    request: {
      params: z.object({
        id: z.string().openapi('Mod ID'),
        version: z.string().openapi('Mod version'),
      }),
      body: {
        content: {
          'application/octet-stream': {
            schema: z.instanceof(Uint8Array).openapi({
              description: 'Binary data',
              format: 'binary',
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Upload succeed.',
      },
      401: {
        description: 'Unauthorized.',
      },
      400: {
        description: 'Bad request',
      },
    },
  }),
  async c => {
    const { id, version } = c.req.valid('param')
    if (MAYBE_VERSION_REGEX.test(version)) {
      const body = await (await c.req.blob()).bytes()
      await storage.mod.put(id, version, body)
      return c.body(null)
    } else {
      return c.body(null, 400)
    }
  }
)

app.doc('/doc', {
  info: {
    title: 'Kmf Station Serverless',
    version: 'v1',
  },
  openapi: '3.1.0',
})

// @ts-ignore
app.get('/swagger-ui', swaggerUI({ url: '/doc' }))

Deno.serve(app.fetch)
