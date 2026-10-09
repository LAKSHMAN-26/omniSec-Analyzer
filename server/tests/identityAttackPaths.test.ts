import { describe, expect, it } from 'vitest';
import {
  findIdentityAttackPaths,
  getReachablePrivilegedAssets,
  validateIdentityEnvironment
} from '../../client/src/features/identityAttackPath/analysis';
import type { IdentityEnvironment } from '../../client/src/features/identityAttackPath/demoData';
import { acmeDemoEnvironment } from '../../client/src/features/identityAttackPath/demoData';

function makeEnvironment(
  nodes: IdentityEnvironment['nodes'],
  relationships: IdentityEnvironment['relationships']
): IdentityEnvironment {
  return { organization: 'Test Org', nodes, relationships };
}

function node(
  id: string,
  type: IdentityEnvironment['nodes'][number]['type'],
  privileged = false
): IdentityEnvironment['nodes'][number] {
  return {
    id,
    label: id,
    type,
    description: `${id} test node`,
    properties: {},
    privileged,
    x: 0,
    y: 0
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  enabled = true
): IdentityEnvironment['relationships'][number] {
  return {
    id,
    source,
    target,
    type: 'canModify',
    explanation: `${source} can change ${target} in the test graph.`,
    remediation: `Restrict ${source} permission.`,
    enabled
  };
}

describe('Identity attack path analysis', () => {
  it('finds directed standard-user paths to privileged assets in the fictional demo', () => {
    expect(validateIdentityEnvironment(acmeDemoEnvironment)).toEqual([]);
    expect(acmeDemoEnvironment.nodes.filter((item) => item.type === 'user' || item.type === 'privilegedUser')).toHaveLength(12);
    expect(acmeDemoEnvironment.nodes.filter((item) => item.type === 'group')).toHaveLength(5);
    expect(acmeDemoEnvironment.nodes.filter((item) => item.type === 'computer')).toHaveLength(4);
    expect(acmeDemoEnvironment.nodes.filter((item) => item.type === 'application')).toHaveLength(3);
    expect(acmeDemoEnvironment.relationships.length).toBeGreaterThanOrEqual(15);
    expect(acmeDemoEnvironment.relationships.length).toBeLessThanOrEqual(25);
    expect(findIdentityAttackPaths(acmeDemoEnvironment).some((path) => path.sourceUser.id === 'user-alex' && path.target.id === 'computer-server-01')).toBe(true);
    expect(findIdentityAttackPaths(acmeDemoEnvironment).some((path) => path.sourceUser.id === 'user-jamie' && path.target.id === 'computer-build-02')).toBe(true);
  });

  it('does not infer privilege from group membership without a directed permission path', () => {
    const environment = makeEnvironment(
      [node('user', 'user'), node('group', 'group'), node('asset', 'computer', true)],
      [edge('membership', 'user', 'group')]
    );

    expect(findIdentityAttackPaths(environment)).toEqual([]);
  });

  it('returns no path for disconnected nodes', () => {
    const environment = makeEnvironment(
      [node('user', 'user'), node('group', 'group'), node('asset', 'resource', true)],
      [edge('unrelated', 'group', 'asset')]
    );

    expect(findIdentityAttackPaths(environment)).toEqual([]);
    expect(getReachablePrivilegedAssets(environment, 'user')).toEqual([]);
  });

  it('terminates safely on cycles and still finds an exit path once', () => {
    const environment = makeEnvironment(
      [node('user', 'user'), node('group-a', 'group'), node('group-b', 'group'), node('asset', 'computer', true)],
      [
        edge('first', 'user', 'group-a'),
        edge('cycle-a-b', 'group-a', 'group-b'),
        edge('cycle-b-a', 'group-b', 'group-a'),
        edge('exit', 'group-b', 'asset')
      ]
    );

    const paths = findIdentityAttackPaths(environment);
    expect(paths).toHaveLength(1);
    expect(paths[0].relationshipIds).toEqual(['first', 'cycle-a-b', 'exit']);
  });

  it('recomputes paths after a relationship is simulated as remediated', () => {
    const pathsBefore = findIdentityAttackPaths(acmeDemoEnvironment);
    const fixEdgeId = 'rel-13';
    const pathsAfter = findIdentityAttackPaths(acmeDemoEnvironment, new Set([fixEdgeId]));

    expect(pathsAfter.length).toBeLessThan(pathsBefore.length);
    expect(pathsAfter.some((path) => path.sourceUser.id === 'user-alex' && path.target.id === 'computer-server-01')).toBe(false);
    expect(pathsAfter.some((path) => path.sourceUser.id === 'user-jamie' && path.target.id === 'computer-build-02')).toBe(true);
  });

  it('keeps a target reachable when a separate directed route remains', () => {
    const environment = makeEnvironment(
      [
        node('user', 'user'),
        node('group-a', 'group'),
        node('group-b', 'group'),
        node('asset', 'computer', true)
      ],
      [
        edge('user-to-a', 'user', 'group-a'),
        edge('route-a', 'group-a', 'asset'),
        edge('user-to-b', 'user', 'group-b'),
        edge('route-b', 'group-b', 'asset')
      ]
    );

    const remainingPaths = findIdentityAttackPaths(environment, new Set(['route-a']));

    expect(remainingPaths).toHaveLength(1);
    expect(remainingPaths[0].sourceUser.id).toBe('user');
    expect(remainingPaths[0].target.id).toBe('asset');
  });
});
