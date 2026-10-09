export function flattenResources(root) {
    const result = [];
    const visit = (node) => {
        result.push(node);
        node.children?.forEach(visit);
    };
    visit(root);
    return result;
}
export function isSafeHttpsUrl(value) {
    if (!value)
        return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    }
    catch {
        return false;
    }
}
export function findResourceContext(root, resourceId) {
    const visit = (node, category, subcategory) => {
        const nextCategory = node.nodeType === 'category' ? node : category;
        const nextSubcategory = node.nodeType === 'subcategory' ? node : subcategory;
        if (node.id === resourceId) {
            return { resource: node, category: nextCategory, subcategory: nextSubcategory };
        }
        for (const child of node.children ?? []) {
            const found = visit(child, nextCategory, nextSubcategory);
            if (found)
                return found;
        }
        return null;
    };
    return visit(root, null, null);
}
export function searchResources(root, query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery)
        return [];
    return flattenResources(root)
        .filter((resource) => {
        const context = findResourceContext(root, resource.id);
        const searchable = [
            resource.name,
            resource.description,
            resource.purpose,
            resource.parentCategory,
            ...resource.tags,
            ...resource.useCases,
            context?.category?.name,
            context?.subcategory?.name
        ].filter(Boolean).join(' ').toLocaleLowerCase();
        return searchable.includes(normalizedQuery);
    })
        .sort((left, right) => {
        const leftExact = left.name.toLocaleLowerCase() === normalizedQuery ? 1 : 0;
        const rightExact = right.name.toLocaleLowerCase() === normalizedQuery ? 1 : 0;
        return rightExact - leftExact || left.name.localeCompare(right.name);
    });
}
export function getRelatedResources(root, resourceId) {
    const context = findResourceContext(root, resourceId);
    if (!context)
        return [];
    const explicitIds = new Set(context.resource.relatedResourceIds);
    const siblings = context.subcategory?.children ?? context.category?.children ?? [];
    return flattenResources(root).filter((resource) => resource.id !== resourceId &&
        (explicitIds.has(resource.id) || siblings.some((sibling) => sibling.id === resource.id)));
}
export function validateCatalogue(root) {
    const errors = [];
    const resources = flattenResources(root);
    const ids = new Set();
    for (const resource of resources) {
        if (!resource.id || ids.has(resource.id))
            errors.push(`Duplicate or missing resource id: ${resource.id || '(empty)'}`);
        ids.add(resource.id);
        if (!resource.name.trim() || !resource.parentCategory.trim()) {
            errors.push(`Resource ${resource.id} needs a name and parent category.`);
        }
        if (!resource.description.trim() || !resource.purpose.trim() || !resource.safetyNotes.trim()) {
            errors.push(`Resource ${resource.id} needs a description and purpose.`);
        }
        for (const url of [resource.officialUrl, resource.githubUrl, resource.documentationUrl]) {
            if (url && !isSafeHttpsUrl(url))
                errors.push(`Resource ${resource.id} has an unsafe or invalid URL.`);
        }
    }
    for (const resource of resources) {
        for (const relatedId of resource.relatedResourceIds) {
            if (relatedId === resource.id)
                errors.push(`Resource ${resource.id} cannot be related to itself.`);
            else if (!ids.has(relatedId))
                errors.push(`Resource ${resource.id} references missing resource ${relatedId}.`);
        }
    }
    return errors;
}
