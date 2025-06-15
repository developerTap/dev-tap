import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { FullSlug } from "../../util/path"

export const Robots: QuartzEmitterPlugin = () => ({
  name: "Robots",
  async *emit(ctx) {
    const cfg = ctx.cfg.configuration
    const baseUrl = cfg.baseUrl ?? ""

    const robotsContent = `User-agent: *
Allow: /

Sitemap: https://${baseUrl}/sitemap.xml`

    yield write({
      ctx,
      content: robotsContent,
      slug: "robots" as FullSlug,
      ext: ".txt",
    })
  },
})
