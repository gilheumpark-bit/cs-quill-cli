import { RuleDetector } from '../detector-registry';
import { detectSec009 } from './sec-helpers';

export const sec009Detector: RuleDetector = {
  ruleId: 'SEC-009',
  detect: detectSec009,
};
