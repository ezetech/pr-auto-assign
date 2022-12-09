import { withDebugLog } from '../utils';
import { identifyRequiredApproves as identifyRequiredApprovesFund } from './identify-approves';

export const identifyRequiredApproves = withDebugLog(identifyRequiredApprovesFund);
