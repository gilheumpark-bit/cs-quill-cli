import { RuleDetector } from '../detector-registry';
import { detectSec027 } from './sec-helpers';

export const sec027Detector: RuleDetector = {
  ruleId: 'SEC-027',
  detect: detectSec027,
};
