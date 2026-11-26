import { jsonLd } from "@/lib/seo"

/** Structured data for search engines. Escaped: user-written text can't break out of the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
}
