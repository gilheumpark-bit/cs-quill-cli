import { RuleDetector } from '../detector-registry';
import { detectSec017 } from './sec-helpers';

export const sec017Detector: RuleDetector = {
  ruleId: 'SEC-017',
  detect: detectSec017,
};
