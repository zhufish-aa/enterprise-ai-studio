import type { Context } from '@deepseek-ai/cordis';
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Uses the pinned official bundled-provider API; Cordis owns disposal and catalog invalidation. */
export function registerEnterpriseSkill(ctx: Context): void {
  const directory = fileURLToPath(new URL('../skills/enterprise-sites/', import.meta.url));
  const path = fileURLToPath(new URL('../skills/enterprise-sites/SKILL.md', import.meta.url));
  const parse = (raw: string) => {
    const match = /^---\r?\nname: enterprise-sites\r?\ndescription: ([^\r\n]+)\r?\n---\r?\n/u.exec(
      raw,
    );
    if (!match?.[1]) throw new Error('ENTERPRISE_SKILL_ASSET_INVALID');
    return { description: match[1], content: raw.slice(match[0].length).trim() };
  };
  const { description } = parse(readFileSync(path, 'utf8'));
  const candidate: SkillCandidate = {
    name: 'enterprise-sites',
    description,
    provider: 'enterprise-ai-studio',
    source: 'bundled',
    rank: BUNDLED_SKILL_RANK,
    invocation: { modelInvocable: true, userInvocable: true },
    resourceBase: { kind: 'directory', path: directory.replaceAll('\\', '/') },
    locator: path,
  };
  const provider: SkillProvider = {
    name: 'enterprise-ai-studio',
    list: () => Promise.resolve([candidate]),
    async get(_candidate, options) {
      const { rank: _rank, locator: _locator, ...summary } = candidate;
      const { content } = parse(await readFile(path, { encoding: 'utf8', signal: options.signal }));
      return { ...summary, content };
    },
  };
  ctx.skills.registerProvider(() => provider);
}
