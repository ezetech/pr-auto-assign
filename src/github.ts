import * as yaml from 'yaml';
import { Endpoints } from '@octokit/types';
import { context, getOctokit } from '@actions/github';
import { getInput } from '@actions/core';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { validateConfig } from './config';
import { Config } from './config/typings';
import { debug, error } from './logger';
import { GitHub } from '@actions/github/lib/utils';

function getMyOctokit() {
  const myToken = getInput('token');

  const octokit = getOctokit(myToken);
  return octokit;
}

class PullRequest {
  private _pr: Required<WebhookPayload>['pull_request'];
  constructor(data: Required<WebhookPayload>['pull_request']) {
    this._pr = data;
  }

  get author(): string {
    return this._pr.user.login;
  }

  get isDraft(): boolean {
    return Boolean(this._pr.draft);
  }

  get number(): number {
    return this._pr.number;
  }

  get labelNames(): string[] {
    return (this._pr.labels as { name: string }[]).map((label) => label.name);
  }

  get requestedReviewerLogins(): string[] {
    return (this._pr.requested_reviewers as { login: string }[]).map(
      (label) => label.login,
    );
  }
}

export function getPullRequest(): PullRequest {
  const pr = context.payload.pull_request;
  // @todo validate PR data
  if (!pr) {
    throw new Error('No pull_request data in context.payload');
  }
  debug(`Context.payload: ${JSON.stringify(context.payload)}`);
  return new PullRequest(pr);
}

export function getLatestSha(): string {
  return context.payload.after;
}

export type CommitData = {
  message: string;
  parents: unknown[];
};

export async function getCommitData(sha: string): Promise<CommitData> {
  const octokit = getMyOctokit();
  debug(`Fetching commit data of sha ${sha}`);
  // @todo: also validation needed;
  const response = await octokit.request(
    'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
    {
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: sha,
    },
  );
  if (response.status !== 200) {
    error(`Response.status: ${response.status}`);
    throw new Error(JSON.stringify(response.data));
  }
  return {
    message: response.data.message,
    parents: response.data.parents,
  };
}

export async function fetchConfig(): Promise<Config> {
  const octokit = getMyOctokit();
  const path = getInput('config');

  const response = await octokit.rest.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path,
    ref: context.ref,
  });
  if (response.status !== 200) {
    error(`Response.status: ${response.status}`);
    throw new Error(JSON.stringify(response.data));
  }
  const data = response.data as {
    type: string;
    content: string;
    encoding: 'base64';
  };
  if (data.type !== 'file') {
    throw new Error('Failed to get config');
  }

  const content = Buffer.from(data.content, data.encoding).toString();
  const parsedConfig = yaml.parse(content);
  return validateConfig(parsedConfig);
}

export async function fetchChangedFiles({ pr }: { pr: PullRequest }): Promise<string[]> {
  const octokit = getMyOctokit();

  const changedFiles: string[] = [];

  const perPage = 100;
  let page = 0;
  let numberOfFilesInCurrentPage: number;

  do {
    page += 1;

    const { data: responseBody } = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number,
      page,
      per_page: perPage,
    });

    numberOfFilesInCurrentPage = responseBody.length;
    changedFiles.push(...responseBody.map((file) => file.filename));
  } while (numberOfFilesInCurrentPage === perPage);

  return changedFiles;
}

export async function assignReviewers(
  pr: PullRequest,
  reviewers: string[],
): Promise<void> {
  const octokit = getMyOctokit();
  await octokit.rest.pulls.requestReviewers({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pr.number,
    reviewers: reviewers,
  });
  return;
}

export type CreateIssueCommentResponseData =
  Endpoints['POST /repos/{owner}/{repo}/issues/{issue_number}/comments']['response']['data'];

export async function getExistingCommentId(
  issueNumber: number,
  messageId: string,
): Promise<number | undefined> {
  const octokit = getMyOctokit();
  const parameters = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    per_page: 100,
  };

  let found;

  for await (const comments of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    parameters,
  )) {
    found = comments.data.find(({ body }) => {
      return (body?.search(messageId) ?? -1) > -1;
    });

    if (found) {
      break;
    }
  }

  return found?.id;
}

export async function updateComment(
  existingCommentId: number,
  body: string,
): Promise<CreateIssueCommentResponseData> {
  const octokit = getMyOctokit();
  const updatedComment = await octokit.rest.issues.updateComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: existingCommentId,
    body,
  });

  return updatedComment.data;
}

export async function createComment(
  issueNumber: number,
  body: string,
): Promise<CreateIssueCommentResponseData> {
  const octokit = getMyOctokit();
  const createdComment = await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
    body,
  });

  return createdComment.data;
}
