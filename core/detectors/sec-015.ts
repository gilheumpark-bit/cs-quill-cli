import { RuleDetector } from '../detector-registry';
import { detectSec015 } from './sec-helpers';

export const sec015Detector: RuleDetector = {
  ruleId: 'SEC-015',
  detect: detectSec015,
};
