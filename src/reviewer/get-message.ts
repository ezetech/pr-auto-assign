import { Config, DefaultRules } from '../config/typings';

type ArrayOfItems = { list: string[]; required: number }[];
function formatMessage(arr: ArrayOfItems): string {
  if (!arr.length) {
    return '';
  }
  return arr
    .map((item) => {
      return `- ${item.list.join(', ')} (${item.required} required out of ${
        item.list.length
      })`;
    })
    .join('\n');
}
export function getMessage({
  fileChangesGroups,
  createdBy,
  rulesByCreator,
  defaultRules,
}: {
  createdBy: string;
  rulesByCreator: Config['rulesByCreator'];
  defaultRules?: Config['defaultRules'];
  fileChangesGroups: string[];
}): string {
  const arr: ArrayOfItems = [];
  const rules = rulesByCreator[createdBy];
  if (!rules) {
    if (defaultRules) {
      const rulesByFileGroup = defaultRules.byFileGroups;
      fileChangesGroups.forEach((fileGroup) => {
        const rules = rulesByFileGroup[fileGroup];
        if (!rules) {
          return;
        }
        rules.forEach((rule) => {
          arr.push({ list: rule.reviewers, required: rule.required });
        });
      });
    }
  } else {
    const fileChangesGroupsMap = fileChangesGroups.reduce<Record<string, string>>(
      (result, group) => {
        result[group] = group;
        return result;
      },
      {},
    );

    fileChangesGroups.forEach((fileGroup) => {
      rules.forEach((rule) => {
        if (rule.ifChanged) {
          const matchFileChanges = rule.ifChanged.some((group) =>
            Boolean(fileChangesGroupsMap[group]),
          );
          if (!matchFileChanges) {
            return;
          }
        }
        arr.push({ list: rule.reviewers, required: rule.required });
      });
    });
  }
  const result = arr.filter((item) => item.required > 0);
  return formatMessage(result);
}
