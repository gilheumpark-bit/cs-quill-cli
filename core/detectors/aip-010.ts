import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-010: Hallucinated API
 * AI sometimes generates calls to APIs/methods that don't exist.
 * Detects calls to known hallucinated patterns (e.g., Array.prototype methods that don't
 * exist, common misspellings, or fabricated Node/DOM APIs).
 */
export const aip010Detector: RuleDetector = {
  ruleId: 'AIP-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Known hallucinated/non-existent APIs
    const hallucinatedAPIs: Record<string, string> = {
      '.toSorted(': '존재하지 않는 환경에서 Array.prototype.toSorted — target 확인 필요',
      '.toReversed(': '존재하지 않는 환경에서 Array.prototype.toReversed — target 확인 필요',
      '.groupBy(': 'Array.prototype.groupBy는 존재하지 않음 — Object.groupBy 또는 Map.groupBy 사용',
      '.flattern(': 'flattern은 존재하지 않음 — flatten 오타',
      '.trimLeft(': 'trimLeft는 deprecated — trimStart 사용',
      '.trimRight(': 'trimRight는 deprecated — trimEnd 사용',
      '.replaceAll(': 'replaceAll은 ES2021+ — target 확인 필요',
      'Array.from(': '', // valid, skip
    };

    // Check PropertyAccessExpression + CallExpression pairs
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const text = node.getText();

      for (const [api, msg] of Object.entries(hallucinatedAPIs)) {
        if (!msg) continue;
        if (text.includes(api)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `Hallucinated API: ${msg}`,
          });
        }
      }
    });

    // Detect calls to completely fabricated method names on common objects
    const fabricatedPatterns = [
      { pattern: /console\.(success|failure|trace|assert)\s*\(/, msg: (m: string) => `console.${m}은 표준 API가 아님` },
      { pattern: /document\.queryAll\s*\(/, msg: () => 'document.queryAll은 존재하지 않음 — querySelectorAll 사용' },
      { pattern: /window\.onLoad\s*=/, msg: () => 'window.onLoad는 존재하지 않음 — window.onload (소문자) 사용' },
      { pattern: /JSON\.tryParse\s*\(/, msg: () => 'JSON.tryParse는 존재하지 않음 — try { JSON.parse() } 패턴 사용' },
      { pattern: /Math\.clamp\s*\(/, msg: () => 'Math.clamp은 존재하지 않음 — Math.min(Math.max()) 패턴 사용' },
    ];

    const fullText = sourceFile.getFullText();
    const lines = fullText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, msg } of fabricatedPatterns) {
        const match = lines[i].match(pattern);
        if (match) {
          findings.push({
            line: i + 1,
            message: `Hallucinated API: ${msg(match[1] ?? '')}`,
          });
        }
      }
    }

    return findings;
  }
};
