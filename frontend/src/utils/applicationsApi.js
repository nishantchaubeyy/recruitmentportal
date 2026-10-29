import { apiRequest } from './api';

const PAGE_SIZE = 100; // the server caps `limit` at 100

/**
 * Every application matching `params` (e.g. { status: 'SELECTED', search: 'rao' }), fetched page by page.
 * Admin screens used to ask for `limit=200`, which the server silently cut to 100.
 */
export async function fetchAllApplications(params = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const query = new URLSearchParams({ ...params, limit: String(PAGE_SIZE), page: String(page) });
    const res = await apiRequest(`/applications?${query.toString()}`);
    const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    all.push(...rows);
    totalPages = Number(res?.pagination?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && page <= 50);
  return all;
}

/** Applications at the given statuses, merged and de-duplicated. */
export async function fetchApplicationsByStatus(statuses) {
  const lists = await Promise.all(statuses.map((status) => fetchAllApplications({ status })));
  const seen = new Set();
  return lists.flat().filter((app) => (seen.has(app.id) ? false : (seen.add(app.id), true)));
}
