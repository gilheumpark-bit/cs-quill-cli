import { RuleDetector } from '../detector-registry';
import { detectSec023 } from './sec-helpers';

export const sec023Detector: RuleDetector = {
  ruleId: 'SEC-023',
  detect: detectSec023,
};
