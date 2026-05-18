# ML Implementation — End-of-Month Usage Prediction

## What it does

When a user opens the **Analytics** page in the ZCS dashboard, a machine learning model runs entirely inside their browser. It looks at their past monthly usage history, learns a growth trend, and predicts what their storage, upload, download, API requests, and estimated cost will be by the end of the current month.

The prediction updates every time the Analytics page is opened. No data leaves the browser — the model trains and runs locally.

---

## Where the code lives

| File | Purpose |
|---|---|
| `frontend/src/lib/ml-predictor.js` | TF.js model — feature engineering, training, inference, cost calculation |
| `frontend/src/app/dashboard/analytics/page.js` | Analytics page — fetches data, calls the predictor, renders prediction UI |

---

## Why TensorFlow.js

TensorFlow.js is the browser port of TensorFlow. We chose it over alternatives for three reasons:

1. **Real ML** — not hand-coded math. The model genuinely learns from data using gradient descent, the same optimisation technique used in production ML systems.
2. **Client-side** — runs 100% in the browser. No GPU server needed, no extra API endpoint, no cost per prediction.
3. **Dynamic import** — TF.js (~150 KB gzipped) is loaded with `import('@tensorflow/tfjs')` inside a `useEffect`, which means it is code-split into its own chunk by Next.js and only downloaded when the Analytics page is visited. Every other page in the app is completely unaffected.

---

## Why not a bigger model

With 6–12 months of usage history, a deep neural network would overfit to noise and actually perform *worse* than a simple model. The right tool here is a **linear regression** — a single `Dense(1)` layer with no hidden layers. It learns two things:

- What the user's average monthly usage looks like (rolling average feature)
- Whether usage is growing or shrinking over time (trend feature)

That is enough signal to make a meaningful prediction with small data.

---

## Data flow

```
/api/usage/history  →  6 months of monthly totals  →  training data
/api/usage/summary  →  current month so far          →  inference input
                                                           ↓
                                               TF.js model (browser)
                                                           ↓
                                            predicted end-of-month values
                                                           ↓
                                               estimated cost breakdown
```

Both API calls are already made by the Analytics page for the existing charts, so the ML adds zero extra network requests.

---

## How the model works

### Feature engineering

For each metric (storage, upload, download, requests) we train a separate model. We build training rows from the historical data by simulating what was "known" before each month:

| Feature | Description |
|---|---|
| `rollingAvg` | Average of all months before month `i` — captures the user's baseline level |
| `trend` | Least-squares slope of months before `i` — captures whether usage is growing or shrinking |

Target `Y` = the actual monthly total for month `i`.

This means we only ever use *past* data to predict *future* data — no data leakage.

### Normalisation

All features and targets are normalised to [0, 1] before training using min-max scaling:

```
normalised = (value - min) / (max - min)
```

This is required because TF.js optimises faster and more stably when inputs are on the same scale. After inference the output is denormalised back to the original scale.

### Model architecture

```
Input: [rollingAvg_norm, trend_norm]  →  Dense(1, bias=true)  →  predicted_total_norm
```

One layer, two weights, one bias. This is a linear regression expressed as a neural network. It is trained with:

- **Optimiser**: Adam, learning rate 0.05
- **Loss**: Mean Squared Error
- **Epochs**: 300

300 epochs sounds like a lot but with 2–10 training rows it completes in under 50 ms.

### Blending with current pace

The model's historical prediction is good at capturing trends but knows nothing about what has actually happened *this month*. We blend it with a pace-based extrapolation:

```
pacePrediction  = currentSoFar / dayFraction          (linear extrapolation)
modelPrediction = output of the trained TF.js model   (historical trend)

finalPrediction = dayFraction × pacePrediction + (1 - dayFraction) × modelPrediction
```

**Why this formula:** Early in the month (day 3, dayFraction ≈ 0.10), the current pace signal is very noisy — a spike on day 1 can throw it off completely. So we weight the historical model at 90%. By day 25 (dayFraction ≈ 0.80), the current pace is a much more reliable signal, so we weight it at 80%. The blend transitions smoothly between the two.

The final prediction is always floored at `currentSoFar` — the user cannot be predicted to use *less* than they already have.

### Confidence levels

| History available | Confidence |
|---|---|
| 5+ months | High |
| 3–4 months | Medium |
| 1–2 months | Low |

Confidence is shown as a badge on each prediction card and on the section header.

### Cost prediction

After predicting the raw usage values we apply ZCS pricing with free tier deductions:

```
storageCost  = max(0, predictedStorageGB  - 5 GB)      × $0.023 / GB
downloadCost = max(0, predictedDownloadGB - 1 GB)      × $0.09  / GB
requestCost  = max(0, predictedRequests   - 10,000)    / 1,000  × $0.0004
```

This matches exactly the pricing shown on the Billing page.

---

## Memory management

TF.js allocates tensors on the GPU (WebGL backend) or CPU. If not cleaned up they leak across function calls. Every tensor and the model itself is disposed after inference:

```js
tf.dispose([xTensor, yTensor, inferX, model]);
```

---

## Fallback behaviour

| Situation | What happens |
|---|---|
| 0 months of history | "Need at least 1 month of history" message shown |
| 1 month of history | Falls back to simple linear extrapolation, confidence = low |
| TF.js fails to load | `prediction === false`, error message shown, rest of page unaffected |
| User navigates away before training completes | Component unmounts, prediction state is discarded |

---

## Performance impact

| Concern | Reality |
|---|---|
| Bundle size | TF.js is a separate chunk (~150 KB gzip), only downloaded on Analytics page |
| Training time | < 50 ms for 2–10 data points at 300 epochs |
| Inference time | < 1 ms |
| Other pages | Zero impact — dynamic import means TF.js never loads on login, dashboard, buckets, etc. |
| Re-training | Happens once per page visit. No background workers, no intervals. |
