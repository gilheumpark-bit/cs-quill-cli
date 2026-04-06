import { RuleDetector } from '../detector-registry';
import { detectSec002 } from './sec-helpers';

export const sec002Detector: RuleDetector = {
  ruleId: 'SEC-002',
  detect: detectSec002,
};
