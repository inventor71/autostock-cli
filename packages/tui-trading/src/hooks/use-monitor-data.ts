import { readFileSync } from "fs"
import { join } from "path"
import { createSignal, onCleanup } from "solid-js"
import type { MonitorData } from "../types"

export function useMonitorData(steeringDir: string, intervalMs = 1500) {
  const [monitor, setMonitor] = createSignal<MonitorData | null>(null)

  function read(): MonitorData | null {
    try {
      const raw = readFileSync(join(steeringDir, "monitor.json"), "utf-8")
      return JSON.parse(raw) as MonitorData
    } catch {
      return null
    }
  }

  setMonitor(read())
  const timer = setInterval(() => setMonitor(read()), intervalMs)
  onCleanup(() => clearInterval(timer))

  return {
    monitor,
    currentTurn: () => monitor()?.current_turn ?? null,
    recentTurns: () => monitor()?.turns?.recent ?? [],
    recentDecisions: () => monitor()?.decisions ?? [],
    todayCount: () => monitor()?.turns?.today_count ?? 0,
    todayCost: () => monitor()?.turns?.today_cost_usd ?? 0,
    workspaceRoot: () => monitor()?.workspace_root ?? "",
  }
}
