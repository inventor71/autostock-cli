// F8 — unit tests for the pure sidebar derivation/format helpers (bun).
// No solid-js / OpenTUI imports, so this runs without the full submodule install.
import { expect, test } from "bun:test"
import { orderRole, orderTrigger, orderDelta, pnlPct, fmtPct, fmtPrice, isUp } from "./sidebar-format"

test("orderRole mirrors status.py _order_role", () => {
  expect(orderRole({ side: "buy", order_type: "limit" })).toBe("entry")
  expect(orderRole({ side: "buy", order_type: "stop" })).toBe("entry") // BUY always entry
  expect(orderRole({ side: "sell", order_type: "stop" })).toBe("stop")
  expect(orderRole({ side: "sell", order_type: "stop_limit" })).toBe("stop")
  expect(orderRole({ side: "sell", order_type: "limit" })).toBe("take")
})

test("orderTrigger prefers limit then stop", () => {
  expect(orderTrigger({ limit_price: 100, stop_price: 90 })).toBe(100)
  expect(orderTrigger({ stop_price: 90 })).toBe(90)
  expect(orderTrigger({})).toBeUndefined()
})

test("orderDelta = (trigger/current - 1)*100, blank without current", () => {
  // trigger 110, current 100 → +10%
  expect(orderDelta({ limit_price: 110, current_price: 100 })).toBeCloseTo(10, 6)
  // stop 95, current 100 → -5%
  expect(orderDelta({ side: "sell", order_type: "stop", stop_price: 95, current_price: 100 })).toBeCloseTo(-5, 6)
  expect(orderDelta({ limit_price: 110 })).toBeUndefined() // no current
  expect(orderDelta({ limit_price: 110, current_price: 0 })).toBeUndefined() // guard /0
})

test("pnlPct = (current/avg - 1)*100", () => {
  expect(pnlPct({ avg_entry_price: 100, current_price: 120 })).toBeCloseTo(20, 6)
  expect(pnlPct({ avg_entry_price: 100, current_price: 90 })).toBeCloseTo(-10, 6)
  expect(pnlPct({ current_price: 120 })).toBeUndefined()
  expect(pnlPct({ avg_entry_price: 0, current_price: 120 })).toBeUndefined()
})

test("fmtPct has arrow + sign; fmtPrice 2dp; blanks for nullish", () => {
  expect(fmtPct(1.234)).toBe("▲+1.2%")
  expect(fmtPct(-2.0)).toBe("▼-2.0%")
  expect(fmtPct(undefined)).toBe("")
  expect(fmtPrice(182.4)).toBe("182.40")
  expect(fmtPrice(631.2)).toBe("631.20")
  expect(fmtPrice(null)).toBe("")
})

test("isUp boundary: 0 is up", () => {
  expect(isUp(0)).toBe(true)
  expect(isUp(-0.01)).toBe(false)
})
