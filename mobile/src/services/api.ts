import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your machine's local network IP so the phone can reach the backend
// This will be updated when the Expo server starts
const BASE_URL = 'http://192.168.1.100:8080';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('currentUser');
        }
        return Promise.reject(error);
    }
);

export const setBaseURL = (url: string) => {
    api.defaults.baseURL = url;
};

export default api;
