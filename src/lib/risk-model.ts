/**
 * Academic risk model: a real logistic-regression classifier trained in the browser/server
 * with batch gradient descent on a SYNTHETIC training dataset (no real institutional data
 * is available). Metrics are computed on a held-out 20% test split of that synthetic data
 * and must be shown as such — they say nothing about real-world accuracy.
 */

export type RiskInput = {
  avgMarks: number; // 0-100
  attendance: number; // 0-100
  backlogs: number; // count
  cgpa: number; // 0-10
  sgpaTrend: number; // last SGPA minus previous SGPA
};

export const FEATURE_LABELS: Record<keyof RiskInput, string> = {
  avgMarks: "Average marks",
  attendance: "Attendance",
  backlogs: "Active backlogs",
  cgpa: "CGPA",
  sgpaTrend: "SGPA trend",
};

const KEYS: (keyof RiskInput)[] = ["avgMarks", "attendance", "backlogs", "cgpa", "sgpaTrend"];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
}

/** Synthetic students: label = "at risk" via a noisy rule (failing next term). */
export function generateSyntheticData(n = 1500, seed = 42) {
  const r = mulberry32(seed);
  const X: RiskInput[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const ability = gauss(r);
    const avgMarks = clamp(62 + 14 * ability + 6 * gauss(r), 15, 100);
    const attendance = clamp(78 + 8 * ability + 10 * gauss(r), 30, 100);
    const backlogs = Math.max(0, Math.round(1.2 - 1.3 * ability + gauss(r)));
    const cgpa = clamp(avgMarks / 10 - 0.3 + 0.5 * gauss(r), 3, 10);
    const sgpaTrend = clamp(0.8 * gauss(r), -3, 3);
    const z =
      -0.09 * (avgMarks - 55) - 0.07 * (attendance - 75) + 0.9 * backlogs - 0.6 * (cgpa - 6) -
      0.8 * sgpaTrend + 1.2 * gauss(r);
    X.push({ avgMarks, attendance, backlogs, cgpa, sgpaTrend });
    y.push(z > 0.5 ? 1 : 0);
  }
  return { X, y };
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export type TrainedModel = {
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
  metrics: { accuracy: number; precision: number; recall: number; f1: number; rocAuc: number; trainSize: number; testSize: number; positiveRate: number };
};

function auc(scores: number[], labels: number[]) {
  const pairs = scores.map((s, i) => [s, labels[i]] as const).sort((a, b) => a[0] - b[0]);
  let rankSum = 0;
  let pos = 0;
  pairs.forEach(([, l], i) => {
    if (l === 1) {
      rankSum += i + 1;
      pos++;
    }
  });
  const neg = pairs.length - pos;
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

export function trainModel(): TrainedModel {
  const { X, y } = generateSyntheticData();
  const split = Math.floor(X.length * 0.8);
  const rows = X.map((x) => KEYS.map((k) => x[k]));
  const train = rows.slice(0, split);
  const mean = KEYS.map((_, j) => train.reduce((s, r) => s + r[j]!, 0) / train.length);
  const std = KEYS.map((_, j) => Math.sqrt(train.reduce((s, r) => s + (r[j]! - mean[j]!) ** 2, 0) / train.length) || 1);
  const norm = rows.map((r) => r.map((v, j) => (v - mean[j]!) / std[j]!));
  const w = new Array(KEYS.length).fill(0);
  let b = 0;
  const lr = 0.3;
  for (let epoch = 0; epoch < 400; epoch++) {
    const gw = new Array(KEYS.length).fill(0);
    let gb = 0;
    for (let i = 0; i < split; i++) {
      const p = sigmoid(norm[i]!.reduce((s, v, j) => s + v * w[j], b));
      const e = p - y[i]!;
      norm[i]!.forEach((v, j) => (gw[j] += e * v));
      gb += e;
    }
    for (let j = 0; j < w.length; j++) w[j] -= (lr * (gw[j] / split + 0.001 * w[j]));
    b -= (lr * gb) / split;
  }
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const scores: number[] = [];
  const labels: number[] = [];
  for (let i = split; i < X.length; i++) {
    const p = sigmoid(norm[i]!.reduce((s, v, j) => s + v * w[j], b));
    scores.push(p);
    labels.push(y[i]!);
    const pred = p >= 0.5 ? 1 : 0;
    if (pred && y[i]) tp++;
    else if (pred && !y[i]) fp++;
    else if (!pred && !y[i]) tn++;
    else fn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  return {
    weights: w,
    bias: b,
    mean,
    std,
    metrics: {
      accuracy: (tp + tn) / (tp + tn + fp + fn),
      precision,
      recall,
      f1: (2 * precision * recall) / (precision + recall || 1),
      rocAuc: auc(scores, labels),
      trainSize: split,
      testSize: X.length - split,
      positiveRate: y.reduce((a, c) => a + c, 0) / y.length,
    },
  };
}

let cached: TrainedModel | null = null;
export function getModel() {
  return (cached ??= trainModel());
}

export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export function predictRisk(input: RiskInput) {
  const m = getModel();
  const z = KEYS.map((k, j) => ((input[k] - m.mean[j]!) / m.std[j]!) * m.weights[j]!);
  const probability = sigmoid(z.reduce((a, c) => a + c, m.bias));
  const level: RiskLevel =
    probability < 0.25 ? "Low" : probability < 0.5 ? "Moderate" : probability < 0.75 ? "High" : "Critical";
  const factors = KEYS.map((k, j) => ({ key: k, label: FEATURE_LABELS[k], value: input[k], contribution: z[j]! }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { probability, level, factors };
}

export const RISK_EXPLANATIONS: Record<RiskLevel, string> = {
  Low: "Your current pattern looks similar to students who stay on track. Keep your routine steady.",
  Moderate: "Some signals need attention. Small changes now (attendance, weak subjects) prevent bigger problems.",
  High: "Several signals match students who fall behind. Act this week on the top factors below.",
  Critical: "Strong warning signs. Prioritise backlog recovery and talk to a mentor or faculty advisor soon.",
};

export function recommendationsFor(input: RiskInput): string[] {
  const out: string[] = [];
  if (input.attendance < 75) out.push(`Raise attendance from ${input.attendance.toFixed(0)}% to at least 75% — attend every class for the next 3 weeks.`);
  if (input.backlogs > 0) out.push(`Clear ${input.backlogs} backlog${input.backlogs > 1 ? "s" : ""}: use the Backlog Recovery Coach to build a plan for the next exam window.`);
  if (input.avgMarks < 60) out.push("Average marks are below 60. Focus 45 minutes daily on your two weakest subjects.");
  if (input.sgpaTrend < 0) out.push("Your SGPA dropped last semester. Review what changed (schedule, workload) and reset your weekly plan.");
  if (input.cgpa < 7) out.push("CGPA under 7 can limit placement eligibility. Target +0.5 SGPA next semester.");
  if (!out.length) out.push("You're in good shape. Start placement prep and mentor a classmate to deepen your understanding.");
  return out;
}
