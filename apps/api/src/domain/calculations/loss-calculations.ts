import { round } from "./safe-number";

export interface LossBucket {
  type: string;
  quantityKg: number;
}

export function summarizeLosses(losses: LossBucket[]) {
  const totalKg = round(losses.reduce((sum, loss) => sum + Math.max(loss.quantityKg, 0), 0), 3);
  return losses.map((loss) => ({
    ...loss,
    quantityKg: round(Math.max(loss.quantityKg, 0), 3),
    percent: round(totalKg === 0 ? 0 : Math.max(loss.quantityKg, 0) / totalKg, 6)
  }));
}
