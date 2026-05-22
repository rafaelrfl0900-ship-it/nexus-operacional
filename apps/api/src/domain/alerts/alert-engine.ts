import { AlertStatus } from "../calculations/types";

export interface AlertRuleInput {
  metric: "overweight" | "loss" | "yield" | "downtime";
  value: number;
  target: number;
}

export function classifyRule(input: AlertRuleInput): AlertStatus {
  const { metric, value, target } = input;

  if (!Number.isFinite(value) || !Number.isFinite(target) || target === 0) {
    return "ATTENTION";
  }

  if (metric === "yield") {
    if (value >= target) return "OK";
    if (value >= target * 0.95) return "MEDIUM";
    if (value >= target * 0.9) return "ATTENTION";
    return "CRITICAL";
  }

  if (value <= target) return "OK";
  if (value <= target * 1.1) return "MEDIUM";
  if (value <= target * 1.25) return "ATTENTION";
  return "CRITICAL";
}
