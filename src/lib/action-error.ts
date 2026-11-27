import "server-only"

/**
 * A database error as the person sees it: never the raw Postgres text
 * ("violates check constraint …"), always a plain sentence in their language.
 * The details go to the server log for debugging.
 */
export function dbFailure(t: { common: { somethingWrong: string } }, error: { code?: string; message: string }): string {
  console.error("database error in a server action", error.code, error.message)
  return t.common.somethingWrong
}
