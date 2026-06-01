import type { TurnType } from "../types"

const GLYPH: Record<string, string> = {
  research: "●",
  intraday: "○",
  wake: "◆",
  eod: "▲",
  reconcile: "↻",
}

const COLOR: Record<string, string> = {
  research: "cyan",
  intraday: "white",
  wake: "yellow",
  eod: "magenta",
  reconcile: "blue",
}

const ACTION_COLOR: Record<string, string> = {
  BUY: "green",
  SELL: "red",
  HOLD: "gray",
  ADJUST_STOP: "yellow",
}

export function markerGlyph(type: string, health: string): string {
  if (health === "error") return "✕"
  return GLYPH[type] ?? "·"
}

export function markerColor(type: string, health: string): string {
  if (health === "error") return "red"
  return COLOR[type] ?? "white"
}

export function actionColor(action: string): string {
  return ACTION_COLOR[action] ?? "white"
}

export function fmtCost(usd: number): string {
  return `$${usd.toFixed(2)}`
}

export function fmtDuration(ms: number | null): string {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${Math.round(ms / 1000)}s`
}

export function fmtPnl(pnl: number): { text: string; color: string } {
  const sign = pnl >= 0 ? "+" : ""
  return {
    text: `${sign}$${pnl.toFixed(2)}`,
    color: pnl >= 0 ? "green" : "red",
  }
}
