import { info, error, warning, debug } from '../logger';
import * as gh from '../github';
import {
  identifyFileChangeGroups,
  identifyReviewers,
  shouldRequestReview,
} from '../reviewer';

export async function run(): Promise<void> {
  try {
    info('Starting pr auto merge.');

    let config;

    try {
      config = await gh.fetchConfig();
    } catch (err) {
      if ((err as Record<string, unknown>).status === 404) {
        warning(
          'No configuration file is found in the base branch; terminating the process',
        );
        info(JSON.stringify(err));
        return;
      }
      throw err;
    }
    // @todo
    // @ts-ignore
    const pr = gh.getPullRequest();

    /*
    run after:
     - every approve
     - after label add/remove
     - after CI checks status change

    LOGIC:
    - identify by config and changed files correct groups that have to approve with what amount of approvals.
    - identify if current approved users satisfy to the rules for required approvals
    - if any change requested, return
    - if any change was requested and this person didn't approve after, return
    - if tests are failed, return
    - if PR to master, change issue status in Jira
      - change status only if Jira issue, at this moment, belong to correct status — Code Review
      - return
    - if any PR restrictions to merge, return. Like do-not-merge label or tests are failed
    - merge PR
    - change issue status in Jira
     */

    info('Done');
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
