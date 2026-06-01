export interface MonitorData {
  ts: string
  current_turn: CurrentTurn | null
  workspace_root: string | null
  turns: TurnsBlock
  decisions: MonitorDecision[]
  log: string[]
}

export interface CurrentTurn {
  id: string
  type: string
  started_at: string
}

export interface TurnsBlock {
  today_count: number
  today_cost_usd: number
  recent: MonitorTurn[]
}

export interface MonitorTurn {
  id: string
  type: TurnType
  ts: string
  cost_usd: number
  num_decisions: number
  duration_ms: number | null
  summary: string
  health: "ok" | "error"
}

export interface MonitorDecision {
  turn_id: string | null
  ts: string
  symbol: string
  action: "BUY" | "SELL" | "HOLD" | "ADJUST_STOP"
  confidence: number | null
  reason: string
  source: "agent" | "human"
}

export type TurnType = "research" | "intraday" | "wake" | "eod" | "reconcile"

export interface PositionInfo {
  qty: number
  avg_entry_price: number
  current_price: number
  market_value: number
  unrealized_pnl: number
}

export interface OverlayState {
  type: "turn" | "symbol" | null
  turnId: string | null
  symbol: string | null
  anchorX: number
  anchorY: number
}
