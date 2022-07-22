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


    info('Done');
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
