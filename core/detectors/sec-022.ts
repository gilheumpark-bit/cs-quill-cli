import { RuleDetector } from '../detector-registry';
import { detectSec022 } from './sec-helpers';

export const sec022Detector: RuleDetector = {
  ruleId: 'SEC-022',
  detect: detectSec022,
};
