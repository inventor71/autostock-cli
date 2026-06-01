import { createSignal, onCleanup, createMemo, Show, For } from "solid-js"
import type { MonitorData, CurrentTurn } from "../types"
import { DEFAULT_MARKET_RULE } from "../types"
import { computeLayout, phaseAt } from "../utils/timeline-layout"
import { readSessionData, shiftDate } from "../hooks/use-session-data"
import {
  markerGlyph, markerColor, interventionGlyph, interventionColor, fmtCost,
  phaseLabel, phaseShort, phaseColor,
} from "../utils/format"

export interface TimelineBarProps {
  width: number
  monitor: () => MonitorData | null
  currentTurn: () => CurrentTurn | null
  onMarkerClick: (turnId: string, x: number, y: number) => void
  onInterventionClick?: (ts: string, x: number, y: number) => void
}

// F25: ET date (America/New_York) for "today" — the default session.
function todayEtDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())
}

export function TimelineBar(props: TimelineBarProps) {
  const [blinkOn, setBlinkOn] = createSignal(true)
  const blinkTimer = setInterval(() => setBlinkOn((v) => !v), 500)
  onCleanup(() => clearInterval(blinkTimer))

  // Selected session date; null means "follow the live session" (Today).
  const [pinnedDate, setPinnedDate] = createSignal<string | null>(null)

  const liveDate = () => props.monitor()?.session_et_date ?? todayEtDate()
  const selectedDate = () => pinnedDate() ?? liveDate()
  const isToday = () => pinnedDate() === null || pinnedDate() === liveDate()

  const goPrev = () => setPinnedDate(shiftDate(selectedDate(), -1))
  const goNext = () => setPinnedDate(shiftDate(selectedDate(), +1))
  const goToday = () => setPinnedDate(null)

  const rule = () => props.monitor()?.market ?? DEFAULT_MARKET_RULE

  const session = createMemo(() => readSessionData(props.monitor(), selectedDate()))

  const layout = createMemo(() =>
    computeLayout({
      turns: session().turns,
      interventions: session().interventions,
      barWidth: props.width,
      etDate: selectedDate(),
      rule: rule(),
    }),
  )

  const disconnected = () => props.monitor() === null

  // Current market phase (only meaningful on the live "Today" session).
  const phase = () => (isToday() ? phaseAt(layout().bounds, Date.now()) : null)

  return (
    <box width={props.width} height={3} flexDirection="column">
      <Show when={!disconnected()} fallback={<text fg="gray">{"  Monitor disconnected"}</text>}>
        {/* Row 0: date nav + current market-phase badge + cost */}
        <NavRow
          date={selectedDate()}
          isToday={isToday()}
          phase={phase()}
          width={props.width}
          todayCost={isToday() ? (props.monitor()?.turns?.today_cost_usd ?? 0) : 0}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
        />
        {/* Row 1: tick labels (local time) + now arrow */}
        <TickRow
          layout={layout()}
          width={props.width}
          currentTurn={isToday() ? props.currentTurn() : null}
          blinkOn={blinkOn()}
        />
        {/* Row 2: market regions + markers */}
        <MarkerRow
          layout={layout()}
          width={props.width}
          currentTurn={isToday() ? props.currentTurn() : null}
          blinkOn={blinkOn()}
          onMarkerClick={props.onMarkerClick}
          onInterventionClick={props.onInterventionClick}
        />
      </Show>
    </box>
  )
}

function NavRow(props: {
  date: string
  isToday: boolean
  phase: string | null
  width: number
  todayCost: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const label = () => (props.isToday ? `${props.date} (Today)` : props.date)
  // Padded, bracketed hit targets — a 1-char arrow flush at column 0 is nearly
  // impossible to click (the `<` was unclickable; `>` had room after the label).
  return (
    <box width={props.width} flexDirection="row" gap={1} paddingLeft={1}>
      <box onMouseUp={(e: any) => { props.onPrev(); e.stopPropagation?.() }}>
        <text fg="cyan">{"[ < ]"}</text>
      </box>
      <text fg="white">{label()}</text>
      <box onMouseUp={(e: any) => { props.onNext(); e.stopPropagation?.() }}>
        <text fg="cyan">{"[ > ]"}</text>
      </box>
      <Show when={!props.isToday}>
        <box onMouseUp={(e: any) => { props.onToday(); e.stopPropagation?.() }}>
          <text fg="yellow">{"[ Today ]"}</text>
        </box>
      </Show>
      {/* Current market-phase badge — answers "pre-market or regular right now?" */}
      <Show when={props.phase}>
        <text fg={phaseColor(props.phase!)}>{`● ${phaseLabel(props.phase!)}`}</text>
      </Show>
      <Show when={props.isToday}>
        <text fg="gray">{`· ${fmtCost(props.todayCost)}`}</text>
      </Show>
    </box>
  )
}

function TickRow(props: {
  layout: ReturnType<typeof computeLayout>
  width: number
  currentTurn: CurrentTurn | null
  blinkOn: boolean
}) {
  const line = () => {
    const chars = new Array(props.width).fill(" ")
    for (const tick of props.layout.ticks) {
      const lbl = tick.label
      for (let i = 0; i < lbl.length && tick.x + i < props.width; i++) {
        if (tick.x + i >= 0) chars[tick.x + i] = lbl[i]
      }
    }
    return chars.join("")
  }
  const nowX = () => props.layout.nowX
  return (
    <box width={props.width}>
      <text fg="gray">{line()}</text>
      {/* Now marker: a bright downward arrow above the timeline (clearly "now"). */}
      <Show when={nowX() >= 0 && nowX() < props.width}>
        <box position="absolute" left={nowX()} width={1}>
          <text fg={props.currentTurn && props.blinkOn ? "green" : "yellow"}><b>▼</b></text>
        </box>
      </Show>
    </box>
  )
}

// Market-region backgrounds — distinct enough to read on a dark terminal; the
// regular session is the brightest (it's the one that matters most).
const REGION_BG: Record<string, string> = {
  pre: "#26304d",      // dim blue  (pre-market)
  regular: "#1f4d33",  // green     (regular session — brightest)
  after: "#3d2740",    // dim purple (after-hours)
}

// A region band: dashes with an inline label (PRE/OPEN/AFT) when there's room,
// so the session is identifiable by text — not reliant on background color.
function bandText(kind: string, w: number): string {
  if (w <= 0) return ""
  const lbl = phaseShort(kind)
  if (w < lbl.length + 2) return "─".repeat(w)
  return "─" + lbl + "─".repeat(w - 1 - lbl.length)
}

function MarkerRow(props: {
  layout: ReturnType<typeof computeLayout>
  width: number
  currentTurn: CurrentTurn | null
  blinkOn: boolean
  onMarkerClick: (turnId: string, x: number, y: number) => void
  onInterventionClick?: (ts: string, x: number, y: number) => void
}) {
  const reg = () => props.layout.regions.find((r) => r.kind === "regular")

  return (
    <box width={props.width}>
      {/* Height anchor (full-width spaces under everything). */}
      <text fg="gray">{" ".repeat(props.width)}</text>
      {/* Region-colored line: the dashes carry each region's bg so the market
          session is visible (a separate full-width line on top would overwrite
          the backgrounds). Rendered after the anchor so it shows on top of it. */}
      <For each={props.layout.regions}>
        {(r) => (
          <Show when={r.x1 > r.x0}>
            <box position="absolute" left={r.x0} width={Math.max(r.x1 - r.x0, 1)}>
              {/* Band tinted with the phase color (readable even if the terminal
                  doesn't render bg) + an inline label so each region is named. */}
              <text bg={REGION_BG[r.kind]} fg={phaseColor(r.kind)}>
                {bandText(r.kind, Math.max(r.x1 - r.x0, 1))}
              </text>
            </box>
          </Show>
        )}
      </For>
      {/* Market open/close boundaries — bright, on top of the regions. */}
      <Show when={reg() && reg()!.x0 >= 0 && reg()!.x0 < props.width}>
        <box position="absolute" left={reg()!.x0} width={1}>
          <text fg="#7faaff" bg={REGION_BG.regular}><b>│</b></text>
        </box>
      </Show>
      <Show when={reg() && reg()!.x1 >= 0 && reg()!.x1 < props.width}>
        <box position="absolute" left={reg()!.x1} width={1}>
          <text fg="#7faaff" bg={REGION_BG.after}><b>│</b></text>
        </box>
      </Show>
      {/* Turn markers */}
      <For each={props.layout.markers}>
        {(mp) => (
          <Show when={mp.x >= 0 && mp.x < props.width}>
            <box position="absolute" left={mp.x} width={1}
              onMouseUp={(evt: any) => { props.onMarkerClick(mp.turn.id, evt.x ?? mp.x, 3); evt.stopPropagation?.() }}>
              <text fg={markerColor(mp.turn.type, mp.turn.health)}>
                {mp.offscreen === -1 ? "‹" : mp.offscreen === 1 ? "›" : markerGlyph(mp.turn.type, mp.turn.health)}
              </text>
            </box>
          </Show>
        )}
      </For>
      {/* Human intervention markers */}
      <For each={props.layout.interventions}>
        {(ip) => (
          <Show when={ip.x >= 0 && ip.x < props.width}>
            <box position="absolute" left={ip.x} width={1}
              onMouseUp={(evt: any) => { props.onInterventionClick?.(ip.intervention.ts, evt.x ?? ip.x, 3); evt.stopPropagation?.() }}>
              <text fg={interventionColor(ip.intervention.verb)}>
                {ip.offscreen === -1 ? "‹" : ip.offscreen === 1 ? "›" : interventionGlyph(ip.intervention.verb)}
              </text>
            </box>
          </Show>
        )}
      </For>
      {/* Now indicator: a bright vertical bar under the TickRow's ▼, forming a
          clear "now" cursor. Blinks green while a turn is in progress. */}
      <Show when={props.layout.nowX >= 0 && props.layout.nowX < props.width}>
        <box position="absolute" left={props.layout.nowX} width={1}>
          <text fg={props.currentTurn && props.blinkOn ? "green" : "yellow"}><b>┃</b></text>
        </box>
      </Show>
    </box>
  )
}
