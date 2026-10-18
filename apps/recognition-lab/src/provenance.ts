import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export function sha256(data: string | Buffer): string { return createHash('sha256').update(data).digest('hex'); }
export function gitState(repo: string) {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const status = git('status', '--porcelain=v1', '-z', '--untracked-files=all');
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean).sort();
  const hashes = untracked.map(path => {
    const location = resolve(repo, path);
    return [path, sha256(lstatSync(location).isSymbolicLink() ? readlinkSync(location) : readFileSync(location))];
  });
  return {
    commit: git('rev-parse', 'HEAD').trim(), branch: git('branch', '--show-current').trim(),
    dirty: status.length > 0,
    fingerprintAlgorithm: 'sha256(status-z + diff-HEAD-binary + sorted-untracked-path-content-hashes)-v1',
    diffFingerprint: sha256(JSON.stringify([status, git('diff', 'HEAD', '--binary', '--no-ext-diff'), hashes])),
  };
}
