import { RuleDetector } from '../detector-registry';
import { detectSec001 } from './sec-helpers';

export const sec001Detector: RuleDetector = {
  ruleId: 'SEC-001',
  detect: detectSec001,
};
