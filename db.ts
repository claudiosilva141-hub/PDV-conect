import Dexie, { Table } from 'dexie';
import { Product, RawMaterial, Order, Client, User, CompanyInfo, UserPermissions } from './types';

// Define a key for single-record tables like CompanyInfo and UserPermissions
const SINGLETON_KEY = 'singleton';

export class AppDB extends Dexie {
  products!: Table<Product>;
  rawMaterials!: Table<RawMaterial>;
  orders!: Table<Order>;
  clients!: Table<Client>;
  users!: Table<User>;
  companyInfo!: Table<CompanyInfo, string>; // Stores a single record with key 'singleton'
  userPermissions!: Table<UserPermissions, string>; // Stores a single record with key 'singleton'

  constructor() {
    super('ConfecAppDB');
    this.version(1).stores({
      products: '++id, name, stock',
      rawMaterials: '++id, name',
      orders: '++id, type, clientName, status, createdAt',
      clients: '++id, name, cpf, contact',
      users: '++id, username, role',
      companyInfo: '&key', // Using a specific key to ensure only one record
      userPermissions: '&key', // Using a specific key to ensure only one record
    });
  }

  // Helper to get and set singleton records
  async getSingleton<T extends { key: string }>(table: Table<T, string>): Promise<T | undefined> {
    return table.get(SINGLETON_KEY);
  }

  async putSingleton<T extends { key: string }>(table: Table<T, string>, data: Omit<T, 'key'>): Promise<string> {
    return table.put({ ...data, key: SINGLETON_KEY } as T);
  }
}

export const db = new AppDB();
export { SINGLETON_KEY };