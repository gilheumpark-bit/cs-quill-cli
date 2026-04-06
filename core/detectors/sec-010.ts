import { RuleDetector } from '../detector-registry';
import { detectSec010 } from './sec-helpers';

export const sec010Detector: RuleDetector = {
  ruleId: 'SEC-010',
  detect: detectSec010,
};
