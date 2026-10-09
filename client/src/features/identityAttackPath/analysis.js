const privilegedAssetTypes = new Set([
    'computer',
    'application',
    'resource'
]);
export function findIdentityAttackPaths(environment, disabledRelationshipIds = new Set()) {
    const nodesById = new Map(environment.nodes.map((node) => [node.id, node]));
    const outgoing = new Map();
    for (const relationship of environment.relationships) {
        if (!nodesById.has(relationship.source) || !nodesById.has(relationship.target)) {
            throw new Error(`Relationship "${relationship.id}" references an unknown node.`);
        }
        if (!relationship.enabled || disabledRelationshipIds.has(relationship.id))
            continue;
        const edges = outgoing.get(relationship.source) ?? [];
        edges.push(relationship);
        outgoing.set(relationship.source, edges);
    }
    const paths = [];
    const maxDepth = environment.nodes.length;
    for (const start of environment.nodes) {
        if (start.type !== 'user')
            continue;
        const visit = (currentId, visitedNodeIds, pathRelationships) => {
            if (pathRelationships.length > maxDepth)
                return;
            const current = nodesById.get(currentId);
            if (!current)
                return;
            if (current.privileged && privilegedAssetTypes.has(current.type)) {
                const relationshipIds = pathRelationships.map((edge) => edge.id);
                paths.push({
                    id: `${start.id}:${current.id}:${relationshipIds.join('|')}`,
                    sourceUser: start,
                    target: current,
                    nodeIds: visitedNodeIds,
                    relationshipIds,
                    relationships: pathRelationships,
                    explanation: pathRelationships.map((edge) => edge.explanation).join(' '),
                    whyRisky: `A standard identity could traverse these directed permissions to reach privileged asset ${current.label}. This is a potential impact in the simulated dataset, not a verified real-world compromise.`,
                    remediation: pathRelationships
                        .filter((edge) => edge.type === 'canModify')
                        .map((edge) => edge.remediation)
                        .filter((value, index, values) => values.indexOf(value) === index)
                        .join(' ') || 'Reduce the originating access, scope privileged permissions to business need, and review the complete path.'
                });
                return;
            }
            for (const relationship of outgoing.get(currentId) ?? []) {
                if (visitedNodeIds.includes(relationship.target))
                    continue;
                visit(relationship.target, [...visitedNodeIds, relationship.target], [...pathRelationships, relationship]);
            }
        };
        visit(start.id, [start.id], []);
    }
    return paths;
}
export function getReachablePrivilegedAssets(environment, startNodeId, disabledRelationshipIds = new Set()) {
    return [...new Map(findIdentityAttackPaths(environment, disabledRelationshipIds)
            .filter((path) => path.sourceUser.id === startNodeId)
            .map((path) => [path.target.id, path.target])).values()];
}
export function getNodeRelationships(environment, nodeId) {
    return environment.relationships.filter((relationship) => relationship.source === nodeId || relationship.target === nodeId);
}
export function validateIdentityEnvironment(environment) {
    const errors = [];
    const nodeIds = new Set();
    const relationshipIds = new Set();
    if (!environment.organization.trim())
        errors.push('Organization name is required.');
    for (const node of environment.nodes) {
        if (!node.id.trim() || nodeIds.has(node.id))
            errors.push(`Node ID "${node.id}" is missing or duplicated.`);
        nodeIds.add(node.id);
        if (!node.label.trim())
            errors.push(`Node "${node.id}" must have a label.`);
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y))
            errors.push(`Node "${node.id}" has invalid graph coordinates.`);
    }
    for (const relationship of environment.relationships) {
        if (!relationship.id.trim() || relationshipIds.has(relationship.id)) {
            errors.push(`Relationship ID "${relationship.id}" is missing or duplicated.`);
        }
        relationshipIds.add(relationship.id);
        if (!nodeIds.has(relationship.source) || !nodeIds.has(relationship.target)) {
            errors.push(`Relationship "${relationship.id}" references a node that does not exist.`);
        }
        if (!relationship.explanation.trim())
            errors.push(`Relationship "${relationship.id}" needs an explanation.`);
    }
    return errors;
}
