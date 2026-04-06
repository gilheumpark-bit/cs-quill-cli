import { RuleDetector } from '../detector-registry';
import { detectSec020 } from './sec-helpers';

export const sec020Detector: RuleDetector = {
  ruleId: 'SEC-020',
  detect: detectSec020,
};
