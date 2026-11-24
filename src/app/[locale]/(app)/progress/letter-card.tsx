"use client"

import { MailIcon, SparklesIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { writeWeeklyLetter } from "@/app/actions/letter"
import { IconTile } from "@/components/icon-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/client"

export function LetterCard({ letter }: { letter: { body: string } | null }) {
  const { t } = useI18n()
  const [pending, start] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTile icon={MailIcon} tone="violet" size="sm" /> {t.letter.title}
        </CardTitle>
        <CardDescription>{t.letter.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {letter ? (
          <>
            <div className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">{letter.body}</div>
            <p className="text-xs text-muted-foreground">{t.letter.signature}</p>
          </>
        ) : (
          <>
            <Button
              className="w-fit"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await writeWeeklyLetter()
                  if (!res.ok) toast.error(res.error)
                })
              }
            >
              <SparklesIcon /> {pending ? t.letter.writing : t.letter.write}
            </Button>
            <p className="text-xs text-muted-foreground">{t.letter.privacy}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
