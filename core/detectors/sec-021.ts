import { RuleDetector } from '../detector-registry';
import { detectSec021 } from './sec-helpers';

export const sec021Detector: RuleDetector = {
  ruleId: 'SEC-021',
  detect: detectSec021,
};
