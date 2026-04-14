import axios from 'axios';

// Vite 프록시를 통해 /api → 백엔드로 전달
// 어디서 접속하든 (localhost, 192.168.x.x, 포트포워딩) 동일하게 동작
const API_BASE = '/api';
const UPLOADS_BASE = '/uploads';

const api = axios.create({ baseURL: API_BASE });

export { api, API_BASE, UPLOADS_BASE };
