export function compare(a, b, threshold = 0.75) {
  const resample = (arr, n) =>
    Array.from({ length: n }, (_, i) =>
      arr[Math.round(i * (arr.length - 1) / (n - 1))]
    );

  const norm = (arr) => {
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length);
    return std === 0 ? arr.map(() => 0) : arr.map((x) => (x - mean) / std);
  };

  const pearson = (x, y) => {
    const mx = x.reduce((a, b) => a + b, 0) / x.length;
    const my = y.reduce((a, b) => a + b, 0) / y.length;
    const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
    const den = Math.sqrt(
      x.reduce((s, v) => s + (v - mx) ** 2, 0) *
      y.reduce((s, v) => s + (v - my) ** 2, 0)
    );
    return den === 0 ? 0 : num / den;
  };

  // Determine input format and extract per-axis signals + magnitude
  const magA = a.map(s => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
  const magB = b.map(s => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
  const signalsA = [magA, ...['x', 'y', 'z'].map(k => a.map(s => s[k]))];
  const signalsB = [magB, ...['x', 'y', 'z'].map(k => b.map(s => s[k]))];


  // Resample → z-score → |pearson| for each signal, take the max
  const TARGET_LEN = 64;
  const correlations = signalsA.map((sigA, i) => {
    const sigB = signalsB[i];
    const rA = norm(resample(sigA, TARGET_LEN));
    const rB = norm(resample(sigB, TARGET_LEN));
    return Math.abs(pearson(rA, rB));
  });

  const maxCorr = Math.max(...correlations);
  console.log({ correlations, maxCorr });

  return maxCorr > threshold;
}
