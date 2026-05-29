import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { InternalTuiPlugin } from "../../plugin/internal"
import { createSignal, For, onCleanup, Show } from "solid-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// F4 Unit B (Phase 2) — autostock steering sidebar panel. Reads the daemon's live
// read-view (steering/snapshot.json, published by Unit A) and shows run-state /
// market / positions / pending-approvals. Read-only (no order authority); polls the
// file (no daemon round-trip). Path from STEERING_DIR (same as the MCP server).

const id = "internal:sidebar-autostock"

interface Snap {
  run_state?: { paused?: boolean; entries_halted?: boolean }
  market_open?: boolean
  positions?: Record<string, { qty?: number; avg_entry_price?: number }>
  open_orders?: unknown[]
  pending?: unknown[]
  locked_symbols?: Record<string, string | null>
}

function readSnap(): Snap | null {
  const dir = process.env.STEERING_DIR
  if (!dir) return null
  try {
    return JSON.parse(readFileSync(join(dir, "snapshot.json"), "utf8")) as Snap
  } catch {
    return null
  }
}

function View(props: { api: TuiPluginApi }) {
  const [snap, setSnap] = createSignal<Snap | null>(readSnap())
  const timer = setInterval(() => setSnap(readSnap()), 1500)
  onCleanup(() => clearInterval(timer))

  const theme = () => props.api.theme.current
  const runLabel = () => {
    const r = snap()?.run_state
    if (!r) return "?"
    if (r.paused) return "PAUSED"
    if (r.entries_halted) return "HALT-ENTRIES"
    return "RUNNING"
  }
  const positions = () => Object.entries(snap()?.positions ?? {})
  const pendingN = () => (snap()?.pending ?? []).length

  return (
    <Show when={snap()}>
      <box>
        <box flexDirection="row" gap={1}>
          <text fg={theme().text}>
            <b>autostock</b>
          </text>
          <text fg={theme().text}>
            {runLabel()}
            {snap()?.market_open ? " · MKT OPEN" : " · MKT CLOSED"}
          </text>
        </box>
        <Show when={pendingN() > 0}>
          <text fg={theme().text}>pending approvals: {pendingN()} — /pending</text>
        </Show>
        <For each={positions()}>
          {([sym, p]) => (
            <text fg={theme().text}>
              {sym} {String(p?.qty ?? "?")}
              {snap()?.locked_symbols?.[sym] ? " (locked)" : ""}
            </text>
          )}
        </For>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 350,
    slots: {
      sidebar_content() {
        return <View api={api} />
      },
    },
  })
}

const plugin: InternalTuiPlugin = { id, tui }
export default plugin
