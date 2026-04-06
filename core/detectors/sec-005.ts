import { RuleDetector } from '../detector-registry';
import { detectSec005 } from './sec-helpers';

export const sec005Detector: RuleDetector = {
  ruleId: 'SEC-005',
  detect: detectSec005,
};
