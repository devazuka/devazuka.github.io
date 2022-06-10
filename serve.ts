import { serve } from "https://deno.land/std@0.143.0/http/server.ts"
import { serveDir } from "https://deno.land/std@0.143.0/http/file_server.ts"

const opts = { fsRoot: Deno.cwd() }
serve((req) => serveDir(req, opts))
