import { RuleDetector } from '../detector-registry';
import { detectSec026 } from './sec-helpers';

export const sec026Detector: RuleDetector = {
  ruleId: 'SEC-026',
  detect: detectSec026,
};
