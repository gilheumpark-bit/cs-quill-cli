import { RuleDetector } from '../detector-registry';
import { detectSec011 } from './sec-helpers';

export const sec011Detector: RuleDetector = {
  ruleId: 'SEC-011',
  detect: detectSec011,
};
