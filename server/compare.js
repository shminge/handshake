export function compare(a, b, threshold = 0.8) {
  // --- Helpers ---

  const resample = (arr, n) =>
    Array.from({ length: n }, (_, i) =>
      arr[Math.round(i * (arr.length - 1) / (n - 1))]
    );

  const norm = (arr) => {
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length);
    return std === 0 ? arr.map(() => 0) : arr.map((x) => (x - mean) / std);
  };

  const magnitude = (vectors) =>
    vectors.map(([x, y, z]) => Math.sqrt(x ** 2 + y ** 2 + z ** 2));

  const energy = (arr) => arr.reduce((s, x) => s + x * x, 0) / arr.length;

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

  const dtw = (a, b, W) => {
    const N = a.length, M = b.length;
    const mat = Array.from({ length: N }, () => new Array(M).fill(Infinity));

    mat[0][0] = Math.abs(a[0] - b[0]);
    for (let i = 1; i < N; i++) mat[i][0] = mat[i-1][0] + Math.abs(a[i] - b[0]);
    for (let j = 1; j < M; j++) mat[0][j] = mat[0][j-1] + Math.abs(a[0] - b[j]);

    for (let i = 1; i < N; i++)
      for (let j = 1; j < M; j++) {
        if (Math.abs(i - j) > W) continue;
        mat[i][j] = Math.abs(a[i] - b[j]) +
          Math.min(mat[i-1][j], mat[i][j-1], mat[i-1][j-1]);
      }

    return mat[N-1][M-1] / (N + M - 1);
  };

  // --- Pipeline ---

  // Accept either flat arrays or arrays of [x,y,z] vectors
  const isVectors = Array.isArray(a[0]);
  const sigA = isVectors ? magnitude(a) : a;
  const sigB = isVectors ? magnitude(b) : b;

  // Reject if one phone barely moved
  const eA = energy(sigA), eB = energy(sigB);
  const energyRatio = Math.max(eA, eB) / (Math.min(eA, eB) || 1e-6);
  if (energyRatio > 3) {
    console.log("Rejected: energy mismatch", energyRatio);
    return false;
  }

  // Resample to fixed length, then z-score normalize
  const TARGET_LEN = 64;
  const rA = norm(resample(sigA, TARGET_LEN));
  const rB = norm(resample(sigB, TARGET_LEN));

  // DTW with Sakoe-Chiba band
  const W = Math.floor(TARGET_LEN * 0.1);
  const dtwDist = dtw(rA, rB, W);

  // Pearson correlation
  const corr = pearson(rA, rB);

  console.log({ dtwDist, corr, energyRatio });

  // Both metrics must agree
  //return dtwDist < threshold && corr > 0.6;
  return corr > 0.85;
}