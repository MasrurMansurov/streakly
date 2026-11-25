"use client"

/**
 * Streakly's own reminder chime. A web page can't attach a sound to a system
 * notification (the OS decides that), so an open Streakly tab plays this when
 * a reminder arrives. Generated with Web Audio — no audio file to load.
 * Per device; on by default.
 */

const KEY = "streakly:reminder-sound"

export function reminderSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off"
  } catch {
    return true
  }
}

export function setReminderSound(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, "off")
  } catch {}
}

let ctx: AudioContext | null = null

/** A soft two-note chime (A5 → E6). Returns false if the browser blocked audio. */
export async function playChime(): Promise<boolean> {
  try {
    ctx ??= new AudioContext()
    // browsers only allow sound after the person interacted with the page
    if (ctx.state === "suspended") await ctx.resume()
    if (ctx.state !== "running") return false
    const start = ctx.currentTime
    ;[880, 1318.51].forEach((freq, i) => {
      const t = start + i * 0.16
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(t)
      osc.stop(t + 0.95)
    })
    return true
  } catch {
    return false
  }
}
