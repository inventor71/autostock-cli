import { createSignal, onCleanup, Show, For } from "solid-js"
import type { MonitorData, CurrentTurn } from "../types"
import { computeLayout } from "../utils/timeline-layout"
import { markerGlyph, markerColor, fmtCost } from "../utils/format"

export interface TimelineBarProps {
  width: number
  monitor: () => MonitorData | null
  currentTurn: () => CurrentTurn | null
  onMarkerClick: (turnId: string, x: number, y: number) => void
}

export function TimelineBar(props: TimelineBarProps) {
  const [blinkOn, setBlinkOn] = createSignal(true)
  const blinkTimer = setInterval(() => setBlinkOn((v) => !v), 500)
  onCleanup(() => clearInterval(blinkTimer))

  const nowHhmm = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  const layout = () => {
    const turns = props.monitor()?.turns?.recent ?? []
    return computeLayout(turns, props.width, nowHhmm())
  }

  const disconnected = () => props.monitor() === null

  return (
    <box width={props.width} height={2} flexDirection="column">
      <Show when={!disconnected()} fallback={
        <text fg="gray">{"  Monitor disconnected"}</text>
      }>
        <Show when={(layout().markers.length > 0) || (props.currentTurn() !== null)} fallback={
          <text fg="gray">{"  No turns today"}</text>
        }>
          {/* Row 1: tick labels */}
          <TickRow layout={layout()} width={props.width} />
          {/* Row 2: markers */}
          <MarkerRow
            layout={layout()}
            width={props.width}
            currentTurn={props.currentTurn()}
            blinkOn={blinkOn()}
            onMarkerClick={props.onMarkerClick}
            todayCost={props.monitor()?.turns?.today_cost_usd ?? 0}
          />
        </Show>
      </Show>
    </box>
  )
}

function TickRow(props: { layout: ReturnType<typeof computeLayout>; width: number }) {
  const line = () => {
    const chars = new Array(props.width).fill(" ")
    for (const tick of props.layout.ticks) {
      const lbl = tick.label
      for (let i = 0; i < lbl.length && tick.x + i < props.width; i++) {
        chars[tick.x + i] = lbl[i]
      }
    }
    return chars.join("")
  }
  return <text fg="gray">{line()}</text>
}

function MarkerRow(props: {
  layout: ReturnType<typeof computeLayout>
  width: number
  currentTurn: CurrentTurn | null
  blinkOn: boolean
  onMarkerClick: (turnId: string, x: number, y: number) => void
  todayCost: number
}) {
  const line = () => {
    const chars = new Array(props.width).fill("─")
    chars[0] = " "
    chars[1] = " "

    for (const mp of props.layout.markers) {
      if (mp.x >= 0 && mp.x < props.width) {
        chars[mp.x] = markerGlyph(mp.turn.type, mp.turn.health)
      }
    }

    if (props.currentTurn && props.blinkOn) {
      const x = props.layout.nowX
      if (x >= 0 && x < props.width) {
        chars[x] = "◎"
      }
    }

    const nowX = props.layout.nowX
    const blinkActive = props.currentTurn && props.blinkOn
    if (!blinkActive && nowX >= 0 && nowX < props.width - 1) {
      chars[nowX] = "→"
    }

    const costLabel = ` ${fmtCost(props.todayCost)} `
    const costStart = props.width - costLabel.length - 1
    if (costStart > 0) {
      for (let i = 0; i < costLabel.length; i++) {
        chars[costStart + i] = costLabel[i]
      }
    }

    return chars.join("")
  }

  return (
    <box width={props.width}>
      <For each={props.layout.markers}>
        {(mp) => (
          <box
            position="absolute"
            left={mp.x}
            width={1}
            onMouseUp={(evt: any) => {
              props.onMarkerClick(mp.turn.id, evt.x ?? mp.x, 2)
              evt.stopPropagation?.()
            }}
          >
            <text fg={markerColor(mp.turn.type, mp.turn.health)}>
              {markerGlyph(mp.turn.type, mp.turn.health)}
            </text>
          </box>
        )}
      </For>
      {props.currentTurn && props.blinkOn && (
        <box position="absolute" left={props.layout.nowX} width={1}>
          <text fg="green">◎</text>
        </box>
      )}
      <text fg="gray">{line()}</text>
    </box>
  )
}
