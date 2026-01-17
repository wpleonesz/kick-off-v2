import { httpRequest } from '@lib/httpRequest';

const getAll = (filters) => {
  return httpRequest.get('/api/courts/schedules/', filters);
};

const getById = (id) => {
  if (!id) return Promise.resolve({});
  return httpRequest.get(`/api/courts/schedules/${id}`);
};

const create = (params) => {
  return httpRequest.post('/api/courts/schedules', params);
};

const update = (id, params) => {
  params = parseParams(params);
  return httpRequest.put(`/api/courts/schedules/${id}`, params);
};

const deactivate = (id) => {
  return httpRequest.delete(`/api/courts/schedules/${id}`);
};

const activate = (id) => {
  return httpRequest.put(`/api/courts/schedules/${id}`, { active: true });
};

export const courtSchedulesService = {
  getAll,
  getById,
  create,
  update,
  activate,
  deactivate,
};
