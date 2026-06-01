import { createSignal } from "solid-js"
import type { OverlayState } from "../types"

const CLOSED: OverlayState = { type: null, turnId: null, symbol: null, anchorX: 0, anchorY: 0 }

export function createOverlayStore() {
  const [state, setState] = createSignal<OverlayState>(CLOSED)

  return {
    state,

    openTurn(turnId: string, x: number, y: number) {
      const cur = state()
      if (cur.type === "turn" && cur.turnId === turnId) {
        setState(CLOSED)
      } else {
        setState({ type: "turn", turnId, symbol: null, anchorX: x, anchorY: y })
      }
    },

    openSymbol(symbol: string, x: number, y: number) {
      const cur = state()
      if (cur.type === "symbol" && cur.symbol === symbol) {
        setState(CLOSED)
      } else {
        setState({ type: "symbol", turnId: null, symbol, anchorX: x, anchorY: y })
      }
    },

    close() {
      setState(CLOSED)
    },
  }
}
