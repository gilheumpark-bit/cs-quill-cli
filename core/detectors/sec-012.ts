import { RuleDetector } from '../detector-registry';
import { detectSec012 } from './sec-helpers';

export const sec012Detector: RuleDetector = {
  ruleId: 'SEC-012',
  detect: detectSec012,
};
