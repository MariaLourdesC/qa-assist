// With the Vite proxy, all API calls use relative paths (same origin).
// In production, set VITE_API_BASE_URL to your backend URL if frontend
// and backend are on different domains.
const BASE = import.meta.env.VITE_API_BASE_URL || '';

export const API_AUTH     = `${BASE}/auth`;
export const API_PROJECTS = `${BASE}/api/projects`;
export const API_STORIES  = `${BASE}/api/stories`;
export const API_ANALYSES = `${BASE}/api/analyses`;
export const API_FEEDBACK = `${BASE}/api/feedback`;
export const API_HEALTH   = `${BASE}/api/health`;
