import type { MonitorTurn } from "../types"

const MARKET_OPEN_MIN = 9 * 60 + 30
const MARKET_CLOSE_MIN = 16 * 60

function hhmmToMinutes(ts: string): number {
  const [h, m] = ts.split(":").map(Number)
  if (isNaN(h!) || isNaN(m!)) return 0
  return h! * 60 + m!
}

function minutesToHhmm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export interface TimelineLayout {
  startMin: number
  endMin: number
  markers: MarkerPosition[]
  ticks: TickPosition[]
  nowX: number
}

export interface MarkerPosition {
  turn: MonitorTurn
  x: number
}

export interface TickPosition {
  label: string
  x: number
}

export function computeLayout(
  turns: MonitorTurn[],
  barWidth: number,
  nowHhmm: string,
): TimelineLayout {
  const nowMin = hhmmToMinutes(nowHhmm)
  const turnMins = turns.map((t) => hhmmToMinutes(t.ts))

  let startMin = MARKET_OPEN_MIN
  let endMin = Math.max(MARKET_CLOSE_MIN, nowMin + 15)
  for (const m of turnMins) {
    if (m < startMin) startMin = Math.max(0, m - 15)
    if (m > endMin) endMin = m + 15
  }

  const rangeMin = endMin - startMin || 1
  const usable = Math.max(barWidth - 2, 1) // 1-col padding each side

  function minToX(m: number): number {
    return Math.round(1 + ((m - startMin) / rangeMin) * usable)
  }

  const markers: MarkerPosition[] = turns.map((t) => ({
    turn: t,
    x: minToX(hhmmToMinutes(t.ts)),
  }))

  const tickStep = rangeMin <= 120 ? 30 : 60
  const ticks: TickPosition[] = []
  for (
    let m = Math.ceil(startMin / tickStep) * tickStep;
    m <= endMin;
    m += tickStep
  ) {
    ticks.push({ label: minutesToHhmm(m), x: minToX(m) })
  }

  return { startMin, endMin, markers, ticks, nowX: minToX(nowMin) }
}
