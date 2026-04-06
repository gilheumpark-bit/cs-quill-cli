// ============================================================
// CS Quill 🦔 — Integrity Waveform (NOA_OS 적용)
// ============================================================
// 파일별 findings 수를 파동으로 분석해 이상치(anomaly)를 감지.
// 한 파일에서 findings가 갑자기 폭발하면 → 엔진 오탐 가능성 높음 → bail-out.
//
// 원리: 전체 파일의 findings 평균/표준편차를 구하고,
// 평균 + 2σ 이상인 파일을 anomaly로 분류.

// ============================================================
// PART 1 — Types
// ============================================================

export interface WaveformPoint {
  file: string;
  findings: number;
  zScore: number; // 표준편차 기준 거리
  status: 'normal' | 'elevated' | 'anomaly';
}

export interface WaveformAnalysis {
  mean: number;
  stdDev: number;
  threshold: number; // mean + 2σ
  points: WaveformPoint[];
  anomalies: WaveformPoint[];
  totalFindings: number;
  adjustedFindings: number; // anomaly 제외
}

// ============================================================
// PART 2 — Waveform Calculator
// ============================================================

export function analyzeWaveform(
  fileFindings: Array<{ file: string; findings: number }>,
): WaveformAnalysis {
  if (fileFindings.length === 0) {
    return { mean: 0, stdDev: 0, threshold: 0, points: [], anomalies: [], totalFindings: 0, adjustedFindings: 0 };
  }

  const counts = fileFindings.map(f => f.findings);
  const total = counts.reduce((s, c) => s + c, 0);
  const mean = total / counts.length;

  // 표준편차
  const variance = counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  // 임계치: mean + 2σ (최소 20건)
  const threshold = Math.max(mean + 2 * stdDev, 20);

  const points: WaveformPoint[] = fileFindings.map(f => {
    const zScore = stdDev > 0 ? (f.findings - mean) / stdDev : 0;
    let status: WaveformPoint['status'] = 'normal';
    if (f.findings > threshold) status = 'anomaly';
    else if (zScore > 1.5) status = 'elevated';
    return { file: f.file, findings: f.findings, zScore: Math.round(zScore * 100) / 100, status };
  });

  const anomalies = points.filter(p => p.status === 'anomaly');
  const adjustedFindings = total - anomalies.reduce((s, a) => s + a.findings, 0);

  return {
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    threshold: Math.round(threshold),
    points,
    anomalies,
    totalFindings: total,
    adjustedFindings,
  };
}

// ============================================================
// PART 3 — Verdict Adjustor
// ============================================================

/**
 * anomaly 파일의 findings를 verdict 집계에서 제외하거나 downgrade.
 * "한 파일의 오탐 폭발이 전체 프로젝트 verdict를 오염시키지 않는다."
 */
export function adjustForAnomalies(
  allDetails: Array<{ line: number; message: string; severity: string; file?: string }>,
  anomalyFiles: Set<string>,
): { adjusted: typeof allDetails; removedCount: number } {
  const adjusted = allDetails.filter(d => !d.file || !anomalyFiles.has(d.file));
  return { adjusted, removedCount: allDetails.length - adjusted.length };
}

// IDENTITY_SEAL: PART-3 | role=waveform-anomaly | inputs=fileFindings | outputs=WaveformAnalysis
