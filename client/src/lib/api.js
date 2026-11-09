import axios from 'axios';

const http = axios.create({ baseURL: '/api', timeout: 25000 });
const data = (p) => p.then((r) => r.data);
const stackParam = (stack) => (stack && stack.length ? stack.join(',') : undefined);

export const getEvents = ({ stack, ...params }) => data(http.get('/events', { params: { ...params, stack: stackParam(stack) } }));
export const getGraph = (params) => data(http.get('/graph', { params }));
export const getTrends = (params) => data(http.get('/trends', { params }));
export const getAlerts = ({ stack, ...params }) => data(http.get('/alerts', { params: { ...params, stack: stackParam(stack) } }));
export const getStats = () => data(http.get('/stats'));
export const getSources = () => data(http.get('/sources'));
export const searchArticles = (q) => data(http.get('/articles', { params: { q, type: 'all', days: 30, limit: 20 } }));
export const askDefrag = (question) => data(http.post('/ask', { question }));
export const runIngest = (secret) => data(http.post('/defrag/run', null, { headers: { 'x-defrag-secret': secret } }));
