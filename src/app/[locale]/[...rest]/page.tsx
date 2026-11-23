import { notFound } from "next/navigation"

/** Unknown URLs inside a language render the localized not-found page. */
export default function CatchAll() {
  notFound()
}
