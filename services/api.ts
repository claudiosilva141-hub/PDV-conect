import axios from 'axios';
import { Product, Client, Order, User, LoginCredentials, RegisterData, RawMaterial, CompanyInfo, UserPermissions } from '../types';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
});

// Add interceptor to handle errors or tokens if needed
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (credentials: LoginCredentials) => {
        const response = await api.post<User>('/auth/login', credentials);
        return response.data;
    },
    register: async (data: RegisterData) => {
        const response = await api.post<User>('/auth/register', data);
        return response.data;
    },
};

export const companyService = {
    get: async () => {
        const response = await api.get<CompanyInfo>('/company');
        return response.data;
    },
    update: async (data: CompanyInfo) => {
        const response = await api.put<CompanyInfo>('/company', data);
        return response.data;
    },
};

export const productService = {
    getAll: async () => {
        const response = await api.get<Product[]>('/products');
        return response.data;
    },
    create: async (product: Omit<Product, 'id'>) => {
        const response = await api.post<Product>('/products', product);
        return response.data;
    },
    update: async (id: string, product: Partial<Product>) => {
        const response = await api.put<Product>(`/products/${id}`, product);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/products/${id}`);
    },
};

export const clientService = {
    getAll: async () => {
        const response = await api.get<Client[]>('/clients');
        return response.data;
    },
    create: async (client: Omit<Client, 'id'>) => {
        const response = await api.post<Client>('/clients', client);
        return response.data;
    },
    update: async (id: string, client: Partial<Client>) => {
        const response = await api.put<Client>(`/clients/${id}`, client);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/clients/${id}`);
    },
};

export const orderService = {
    getAll: async () => {
        const response = await api.get<Order[]>('/orders?includeItems=true');
        return response.data;
    },
    create: async (order: Omit<Order, 'id'>) => {
        const response = await api.post<Order>('/orders', order);
        return response.data;
    },
    update: async (id: string, order: Partial<Order>) => {
        const response = await api.put<Order>(`/orders/${id}`, order);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/orders/${id}`);
    }
};

export const rawMaterialService = {
    getAll: async () => {
        const response = await api.get<RawMaterial[]>('/raw-materials');
        return response.data;
    },
    create: async (material: Omit<RawMaterial, 'id'>) => {
        const response = await api.post<RawMaterial>('/raw-materials', material);
        return response.data;
    },
    update: async (id: string, material: Partial<RawMaterial>) => {
        const response = await api.put<RawMaterial>(`/raw-materials/${id}`, material);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/raw-materials/${id}`);
    },
};

export const userService = {
    getAll: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
    create: async (user: Omit<User, 'id'>) => {
        const response = await api.post<User>('/users', user);
        return response.data;
    },
    update: async (id: string, user: Partial<User>) => {
        const response = await api.put<User>(`/users/${id}`, user);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    },
};

export const permissionService = {
    get: async () => {
        const response = await api.get<UserPermissions>('/permissions');
        return response.data;
    },
    update: async (permissions: UserPermissions) => {
        const response = await api.put<UserPermissions>('/permissions', permissions);
        return response.data;
    },
};

export default api;
