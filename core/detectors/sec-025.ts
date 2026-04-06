import { RuleDetector } from '../detector-registry';
import { detectSec025 } from './sec-helpers';

export const sec025Detector: RuleDetector = {
  ruleId: 'SEC-025',
  detect: detectSec025,
};
