import { withDebugLog } from '../utils';
import {
  shouldRequestReview as shouldRequestReviewFunc,
  identifyReviewers as identifyReviewersFunc,
  identifyFileChangeGroups as identifyFileChangeGroupsFunc,
} from './reviewer';
import { getMessage as getMessageFund } from './get-message';

export const getMessage = withDebugLog(getMessageFund);
export const shouldRequestReview = withDebugLog(shouldRequestReviewFunc);
export const identifyReviewers = withDebugLog(identifyReviewersFunc);
export const identifyFileChangeGroups = withDebugLog(identifyFileChangeGroupsFunc);
