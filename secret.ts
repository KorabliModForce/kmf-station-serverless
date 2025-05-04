export const SECRET = Deno.env.get('SECRET')
if (!SECRET) {
  throw new Error('SECRET must be specified')
}
