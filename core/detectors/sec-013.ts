import { RuleDetector } from '../detector-registry';
import { detectSec013 } from './sec-helpers';

export const sec013Detector: RuleDetector = {
  ruleId: 'SEC-013',
  detect: detectSec013,
};
