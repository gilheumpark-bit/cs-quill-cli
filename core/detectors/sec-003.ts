import { RuleDetector } from '../detector-registry';
import { detectSec003 } from './sec-helpers';

export const sec003Detector: RuleDetector = {
  ruleId: 'SEC-003',
  detect: detectSec003,
};
