import { RuleDetector } from '../detector-registry';
import { detectSec018 } from './sec-helpers';

export const sec018Detector: RuleDetector = {
  ruleId: 'SEC-018',
  detect: detectSec018,
};
