import { SourceFile } from 'ts-morph';
import { getRule, RuleMeta } from './rule-catalog';

export interface RuleFinding {
  line: number;
  message: string;
}

export interface RuleDetector {
  /**
   * 카탈로그 내의 ruleId (예: 'ERR-005')
   */
  ruleId: string;

  /**
   * AST(ts-morph SourceFile)를 순회하며 위반 사항을 찾는 플러그인 메커니즘
   */
  detect: (sourceFile: SourceFile) => RuleFinding[];
}

export class DetectorRegistry {
  private detectors = new Map<string, RuleDetector>();

  register(detector: RuleDetector) {
    if (!getRule(detector.ruleId)) {
      console.warn(`[Quill] Warning: Rule '${detector.ruleId}' is not defined in rule-catalog.ts`);
    }
    this.detectors.set(detector.ruleId, detector);
  }

  getDetectors(): RuleDetector[] {
    return Array.from(this.detectors.values());
  }

  getRegistryStatus() {
    return {
      connected: this.detectors.size,
      registeredRules: Array.from(this.detectors.keys())
    };
  }
}

export const detectorRegistry = new DetectorRegistry();
