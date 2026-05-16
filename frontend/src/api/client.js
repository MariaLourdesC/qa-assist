import { API_AUTH, API_PROJECTS, API_STORIES, API_ANALYSES, API_FEEDBACK } from '../config';

// ── Refresh lock — prevents concurrent refresh races ─────────────────────
let _refreshing = false;
let _refreshQueue = [];

function drainQueue(error) {
  _refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  _refreshQueue = [];
}

async function attemptRefresh() {
  if (_refreshing) {
    // Wait for the in-progress refresh instead of firing another
    return new Promise((resolve, reject) => _refreshQueue.push({ resolve, reject }));
  }
  _refreshing = true;
  try {
    const res = await fetch(`${API_AUTH}/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('refresh_failed');
    drainQueue(null);
  } catch (err) {
    drainQueue(err);
    throw err;
  } finally {
    _refreshing = false;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────
async function fetchApi(url, options = {}, { _isRetry = false } = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    // No 'credentials' needed — proxy makes requests same-origin
    ...options
  });

  // Access token expired → try refresh once, then retry original request
  if (response.status === 401 && !_isRetry) {
    let body = {};
    try { body = await response.clone().json(); } catch {}

    if (body.code === 'TOKEN_EXPIRED') {
      try {
        await attemptRefresh();
        return fetchApi(url, options, { _isRetry: true }); // retry
      } catch {
        // Refresh failed — soft logout via React Router (no hard reload)
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        throw new Error('Session expired');
      }
    }

    // Hard 401 (not TOKEN_EXPIRED, not an auth endpoint) — soft logout
    if (!url.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      throw new Error('Unauthorized');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth API (no interceptor loop — these ARE the auth endpoints) ─────────
export const authApi = {
  register:       (email, password) =>
    fetchApi(`${API_AUTH}/register`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  login:          (email, password) =>
    fetchApi(`${API_AUTH}/login`,    { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout:         () =>
    fetchApi(`${API_AUTH}/logout`,   { method: 'POST' }),
  me:             () =>
    fetchApi(`${API_AUTH}/me`),
  updateProfile:  (display_name) =>
    fetchApi(`${API_AUTH}/profile`,         { method: 'PATCH', body: JSON.stringify({ display_name }) }),
  changePassword: (current_password, new_password) =>
    fetchApi(`${API_AUTH}/change-password`, { method: 'POST',  body: JSON.stringify({ current_password, new_password }) }),
  forgotPassword: (email) =>
    fetchApi(`${API_AUTH}/forgot-password`, { method: 'POST',  body: JSON.stringify({ email }) }),
  resetPassword:  (token, new_password) =>
    fetchApi(`${API_AUTH}/reset-password`,  { method: 'POST',  body: JSON.stringify({ token, new_password }) })
};

// ── Domain APIs ───────────────────────────────────────────────────────────
export const projectsApi = {
  getAll:     ()         => fetchApi(API_PROJECTS),
  getById:    (id)       => fetchApi(`${API_PROJECTS}/${id}`),
  getStats:   (id)       => fetchApi(`${API_PROJECTS}/${id}/stats`),
  getQaStats: (id)       => fetchApi(`${API_PROJECTS}/${id}/qa-stats`),
  create:     (data)     => fetchApi(API_PROJECTS, { method: 'POST', body: JSON.stringify(data) }),
  update:     (id, data) => fetchApi(`${API_PROJECTS}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:     (id)       => fetchApi(`${API_PROJECTS}/${id}`, { method: 'DELETE' })
};

export const storiesApi = {
  getAll:          (projectId) => fetchApi(`${API_STORIES}${projectId ? `?project_id=${projectId}` : ''}`),
  getById:         (id)        => fetchApi(`${API_STORIES}/${id}`),
  create:          (data)      => fetchApi(API_STORIES, { method: 'POST', body: JSON.stringify(data) }),
  update:          (id, data)  => fetchApi(`${API_STORIES}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:          (id)        => fetchApi(`${API_STORIES}/${id}`, { method: 'DELETE' }),
  checkDuplicates: (data)      => fetchApi(`${API_STORIES}/check-duplicates`, { method: 'POST', body: JSON.stringify(data) }),
  bulkDelete:      (ids)       => fetchApi(`${API_STORIES}/bulk-delete`,  { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkApprove:     (ids)       => fetchApi(`${API_STORIES}/bulk-approve`, { method: 'POST', body: JSON.stringify({ ids }) })
};

export const analysesApi = {
  getAll:        (storyId) => fetchApi(`${API_ANALYSES}?story_id=${storyId}`),
  getById:       (id)      => fetchApi(`${API_ANALYSES}/${id}`),
  create:        (data)    => fetchApi(API_ANALYSES, { method: 'POST', body: JSON.stringify(data) }),
  delete:        (id)      => fetchApi(`${API_ANALYSES}/${id}`, { method: 'DELETE' }),
  saveTraceability: (id, traceability) => fetchApi(`${API_ANALYSES}/${id}/traceability`, { method: 'PATCH', body: JSON.stringify({ traceability }) }),
  saveTcTags:       (id, tc_tags)      => fetchApi(`${API_ANALYSES}/${id}/tc-tags`,      { method: 'PATCH', body: JSON.stringify({ tc_tags }) }),
  suggestRewrite:(id)      => fetchApi(`${API_ANALYSES}/${id}/suggest-rewrite`, { method: 'POST' })
};

export const feedbackApi = {
  getAll: (analysisRunId) => fetchApi(`${API_FEEDBACK}${analysisRunId ? `?analysis_run_id=${analysisRunId}` : ''}`),
  create: (data)          => fetchApi(API_FEEDBACK, { method: 'POST', body: JSON.stringify(data) })
};

export const templatesApi = {
  getAll:  ()         => fetchApi('/api/templates'),
  create:  (data)     => fetchApi('/api/templates',      { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data) => fetchApi(`/api/templates/${id}`, { method: 'PUT',   body: JSON.stringify(data) }),
  delete:  (id)       => fetchApi(`/api/templates/${id}`, { method: 'DELETE' })
};

export const searchApi = {
  query: (q) => fetchApi(`/api/search?q=${encodeURIComponent(q)}`)
};

export const executionsApi = {
  create:       (data)         => fetchApi('/api/executions', { method: 'POST', body: JSON.stringify(data) }),
  getAll:       (analysisRunId) => fetchApi(`/api/executions?analysis_run_id=${analysisRunId}`),
  getById:      (id)           => fetchApi(`/api/executions/${id}`),
  updateResult: (id, data)     => fetchApi(`/api/executions/${id}/results`, { method: 'PATCH', body: JSON.stringify(data) }),
  complete:     (id, data)     => fetchApi(`/api/executions/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  approve:      (id)           => fetchApi(`/api/executions/${id}/approve`,  { method: 'PATCH' }),
  exportBugs:   (id, data)     => fetchApi(`/api/executions/${id}/export-bugs`, { method: 'POST', body: JSON.stringify(data) })
};

export const jiraApi = {
  import:      (data) => fetchApi('/api/jira/import',       { method: 'POST', body: JSON.stringify(data) }),
  exportTests: (data) => fetchApi('/api/jira/export-tests', { method: 'POST', body: JSON.stringify(data) })
};
