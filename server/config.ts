export const BRANCHES_ENABLED = process.env.BRANCHES_ENABLED === 'true';
export const MAX_BRANCHES = process.env.MAX_BRANCHES ? parseInt(process.env.MAX_BRANCHES, 10) : Infinity;
