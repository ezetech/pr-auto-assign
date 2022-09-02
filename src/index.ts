import { info, error, warning, debug } from './logger';
import * as gh from './github';
import {
  identifyFileChangeGroups,
  identifyReviewers,
  shouldRequestReview,
} from './reviewer';
import { CommitData, getCommitData, getLatestSha } from './github';

export async function run(): Promise<void> {
  try {
    info('Starting pr auto assign.');

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
    const pr = gh.getPullRequest();
    const { isDraft, author } = pr;

    const latestSha = getLatestSha();
    let commitData: undefined | CommitData;
    if (config.options?.ignoreReassignForMergedPRs && latestSha) {
      commitData = await getCommitData(latestSha);
    }

    if (
      !shouldRequestReview({
        isDraft,
        commitData,
        options: config.options,
        currentLabels: pr.labelNames,
      })
    ) {
      info(
        `Matched the ignoring rules ${JSON.stringify({
          isDraft,
          commitData,
          prLabels: pr.labelNames,
        })}; terminating the process.`,
      );
      return;
    }

    debug('Fetching changed files in the pull request');
    const changedFiles = await gh.fetchChangedFiles({ pr });
    const fileChangesGroups = identifyFileChangeGroups({
      fileChangesGroups: config.fileChangesGroups,
      changedFiles,
    });
    info(`Identified changed file groups: ${fileChangesGroups.join(', ')}`);

    debug('Identifying reviewers based on the changed files and PR creator');
    const reviewers = identifyReviewers({
      createdBy: author,
      fileChangesGroups,
      rulesByCreator: config.rulesByCreator,
      defaultRules: config.defaultRules,
      requestedReviewerLogins: pr.requestedReviewerLogins,
    });
    info(`Identified reviewers: ${reviewers.join(', ')}`);

    const reviewersToAssign = reviewers.filter((reviewer) => reviewer !== author);
    if (reviewersToAssign.length === 0) {
      info(`No reviewers were matched for author ${author}. Terminating the process`);
      return;
    }
    await gh.assignReviewers(pr, reviewersToAssign);

    info(`Requesting review to ${reviewersToAssign.join(', ')}`);

    info('Done');
  } catch (err) {
    error(err as Error);
  }
  return;
}

run();
