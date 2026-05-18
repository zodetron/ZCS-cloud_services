// ML predictor — dynamically imported so TF.js never loads on other pages.
// Called once per Analytics page visit; disposes all tensors on completion.

const GB = 1024 * 1024 * 1024;

function stats(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return { min, range, norm: arr.map((v) => (v - min) / range) };
}

function denorm(v, min, range) {
  return v * range + min;
}

// Linear slope of an array (least-squares, returns rise per step)
function slope(arr) {
  if (arr.length < 2) return 0;
  const n = arr.length;
  const xi = arr.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = arr.reduce((a, b) => a + b, 0) / n;
  const num = xi.reduce((s, x, i) => s + (x - xMean) * (arr[i] - yMean), 0);
  const den = xi.reduce((s, x) => s + (x - xMean) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

async function trainAndPredict(tf, historicalValues, currentRaw, dayFraction) {
  // Need at least 2 past months to train meaningfully
  if (historicalValues.length < 2) {
    const pace = dayFraction > 0.01 ? currentRaw / dayFraction : historicalValues[0] || 0;
    return { predicted: Math.max(pace, currentRaw), confidence: "low" };
  }

  // ── Feature engineering ──────────────────────────────────────────────────
  // For each historical month i we build a feature row using only data
  // that would have been available *before* month i.
  const xRows = [];
  const yVals = [];

  for (let i = 1; i < historicalValues.length; i++) {
    const prior = historicalValues.slice(0, i);
    const rollingAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const trend = slope(prior); // growth per month
    xRows.push([rollingAvg, trend]);
    yVals.push(historicalValues[i]);
  }

  // ── Normalise ────────────────────────────────────────────────────────────
  const col0 = stats(xRows.map((r) => r[0]));
  const col1 = stats(xRows.map((r) => r[1]));
  const yS = stats(yVals);

  const xNorm = xRows.map((_r, i) => [col0.norm[i], col1.norm[i]]);

  // ── Model: single Dense(1) — pure linear regression ─────────────────────
  const model = tf.sequential({
    layers: [tf.layers.dense({ inputShape: [2], units: 1, useBias: true })],
  });
  model.compile({ optimizer: tf.train.adam(0.05), loss: "meanSquaredError" });

  const xT = tf.tensor2d(xNorm);
  const yT = tf.tensor2d(yS.norm.map((v) => [v]));
  await model.fit(xT, yT, { epochs: 300, verbose: 0 });

  // ── Inference ────────────────────────────────────────────────────────────
  const allVals = historicalValues;
  const inferAvg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
  const inferTrend = slope(allVals);

  const inferX = tf.tensor2d([[
    (inferAvg - col0.min) / col0.range,
    (inferTrend - col1.min) / col1.range,
  ]]);

  const predNorm = model.predict(inferX).dataSync()[0];
  const modelPred = denorm(predNorm, yS.min, yS.range);

  // Pace-based extrapolation from current month so far
  const pacePred = dayFraction > 0.01 ? currentRaw / dayFraction : modelPred;

  // Blend: early in month → trust historical model more;
  //        late in month  → trust current pace more.
  // dayFraction=0 → 100% model, dayFraction=1 → 100% pace
  const blended = dayFraction * pacePred + (1 - dayFraction) * modelPred;
  const predicted = Math.max(blended, currentRaw); // can't be less than we've already used

  tf.dispose([xT, yT, inferX, model]);

  const confidence =
    historicalValues.length >= 5 ? "high"
    : historicalValues.length >= 3 ? "medium"
    : "low";

  return { predicted, confidence };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function runMLPrediction(historyRaw, summaryNow) {
  // Dynamic import: TF.js chunk is only downloaded when this is called
  const tf = await import("@tensorflow/tfjs");

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayFraction = dayOfMonth / daysInMonth;

  // History comes newest-first from the API — reverse to oldest-first
  const history = [...historyRaw].reverse();

  const METRICS = [
    { key: "storageBytes",  label: "Storage",   unit: "GB",  scale: GB      },
    { key: "uploadBytes",   label: "Upload",    unit: "GB",  scale: GB      },
    { key: "downloadBytes", label: "Download",  unit: "GB",  scale: GB      },
    { key: "requestCount",  label: "Requests",  unit: "",    scale: 1       },
  ];

  const results = {};

  for (const m of METRICS) {
    const historicalValues = history.map((h) => Number(h[m.key]));
    const currentRaw = Number(summaryNow[m.key] ?? 0);

    const { predicted, confidence } = await trainAndPredict(
      tf, historicalValues, currentRaw, dayFraction
    );

    results[m.key] = {
      label:     m.label,
      unit:      m.unit,
      current:   currentRaw  / m.scale,
      predicted: predicted   / m.scale,
      confidence,
    };
  }

  // Cost estimate from predicted values
  const FREE = { storageGB: 5, egressGB: 1, requests: 10_000 };
  const RATES = { storageGB: 50, uploadGB: 30, egressGB: 20, requests1k: 500 };

  const storageCost  = Math.max(0, results.storageBytes.predicted  - FREE.storageGB)  * RATES.storageGB;
  const uploadCost   = results.uploadBytes.predicted * RATES.uploadGB;
  const downloadCost = Math.max(0, results.downloadBytes.predicted - FREE.egressGB)   * RATES.egressGB;
  const requestCost  = Math.max(0, results.requestCount.predicted  - FREE.requests)   / 1000 * RATES.requests1k;

  results.cost = {
    label:     "Est. Cost",
    unit:      "$",
    current:   null,
    predicted: +(storageCost + uploadCost + downloadCost + requestCost).toFixed(4),
    confidence: results.storageBytes.confidence,
  };

  return { results, dayOfMonth, daysInMonth, dayFraction };
}
