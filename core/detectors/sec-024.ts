import { RuleDetector } from '../detector-registry';
import { detectSec024 } from './sec-helpers';

export const sec024Detector: RuleDetector = {
  ruleId: 'SEC-024',
  detect: detectSec024,
};
