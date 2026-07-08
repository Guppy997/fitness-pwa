const request = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 204) return null;
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) throw new Error(body?.error || `Fehler ${res.status}`);
  return body;
};

const post = (path, data) => request(path, { method: 'POST', body: JSON.stringify(data ?? {}) });
const put = (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) });
const patch = (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) });
const del = (path, data) => request(path, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}) });

export const api = {
  // Daily
  getDaily: (date) => request(`/daily/${date}`),
  toggleDaily: (date, key) => post(`/daily/${date}/toggle`, { key }),

  // Gym
  getNextWorkout: () => request('/gym/next'),
  getTodayGym: () => request('/gym/today'),
  getGymSession: (id) => request(`/gym/sessions/${id}`),
  getGymHistoryForMonth: (month) => request(`/gym/history?month=${month}`),
  startGymSession: (workout) => post('/gym/sessions', workout ? { workout } : {}),
  logSet: (sessionId, data) => put(`/gym/sessions/${sessionId}/sets`, data),
  unlogSet: (sessionId, data) => del(`/gym/sessions/${sessionId}/sets`, data),
  completeGymSession: (sessionId, notes) => post(`/gym/sessions/${sessionId}/complete`, { notes }),
  deleteGymSession: (sessionId) => del(`/gym/sessions/${sessionId}`),

  // Exercises / Einstellungen
  getExercises: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/exercises${qs ? `?${qs}` : ''}`);
  },
  updateExercise: (key, data) => patch(`/exercises/${key}`, data),
  createExercise: (data) => post('/exercises', data),
  deleteExercise: (key) => del(`/exercises/${key}`),
  reorderExercises: (category, workout, orderedKeys) => patch('/exercises/reorder', { category, workout, orderedKeys }),

  // Stats
  getHeatmap: (days = 365) => request(`/stats/heatmap?days=${days}`),
  getMonthHeatmap: (month) => request(`/stats/heatmap?month=${month}`),
  getSummary: () => request('/stats/summary'),
  getMonthlyStats: (month) => request(`/stats/monthly?month=${month}`),
  getRecords: () => request('/stats/records')
};
