import { RuleDetector } from '../detector-registry';
import { detectSec007 } from './sec-helpers';

export const sec007Detector: RuleDetector = {
  ruleId: 'SEC-007',
  detect: detectSec007,
};
