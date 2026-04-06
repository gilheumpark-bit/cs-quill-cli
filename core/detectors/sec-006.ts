import { RuleDetector } from '../detector-registry';
import { detectSec006 } from './sec-helpers';

/** eval() 자체는 quill-engine AST에서 SEC-006으로 처리 — 여기서는 중복 제거 */
export const sec006Detector: RuleDetector = {
  ruleId: 'SEC-006',
  detect: detectSec006,
};
