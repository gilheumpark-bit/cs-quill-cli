import { RuleDetector } from '../detector-registry';
import { detectSec004 } from './sec-helpers';

export const sec004Detector: RuleDetector = {
  ruleId: 'SEC-004',
  detect: detectSec004,
};
