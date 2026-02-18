import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { POSPage } from './pages/POSPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CompanyInfo, Product, Order, RawMaterial, Client, User, UserRole, AuthContextType, UserPermissions } from './types';
import { COMPANY_NAME_DEFAULT, DEFAULT_USER_PERMISSIONS } from './constants';
import { StockPage } from './pages/StockPage';
import { SettingsPage } from './pages/SettingsPage';
import { ClientsPage } from './pages/ClientsPage';
import { api, authService, companyService, productService, clientService, orderService, rawMaterialService, userService, permissionService } from './services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // State to track if initial data loading is complete
  const [dataLoaded, setDataLoaded] = useState(false);

  // All application data states
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: COMPANY_NAME_DEFAULT, logo: null });
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS);
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  // isAuthenticated is true if currentUser exists
  const isAuthenticated = !!currentUser;

  const loadData = async () => {
    try {
      console.log('Fetching data from API...');

      // Parallel fetching for performance
      const loadedCompanyInfo = await companyService.get().catch(() => ({ name: COMPANY_NAME_DEFAULT, logo: null }));
      setCompanyInfo(loadedCompanyInfo);

      // Check for session (simple localStorage persistence for currentUser)
      const storedCurrentUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('authToken');

      if (storedCurrentUser && token) {
        try {
          const parsedUser = JSON.parse(storedCurrentUser);
          setCurrentUser(parsedUser);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
        }
      } else {
        // Not logged in. Check if we need initial setup.
        // we can move this check to a dedicated effect or just here
        try {
          const loadedUsers = await userService.getAll();
          setIsInitialSetup(loadedUsers.length === 0);
        } catch (e) {
          // If 401, it means there are likely users but we aren't one of them yet
          // or we just aren't logged in. 
          // Better logic: if we get 401, assume NOT initial setup.
          setIsInitialSetup(false);
        }
      }

      setConnectionError(false);
      setDataLoaded(true);
      console.log('Data loaded successfully.');
    } catch (error) {
      console.error('Failed to load data during initialization:', error);
      setConnectionError(true);
      setDataLoaded(true);
    }
  };

  // --- Data Loading Effect ---
  useEffect(() => {
    loadData();
  }, []);

  // Fetch full data when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      const fetchProtectedData = async () => {
        try {
          const [
            loadedProducts,
            loadedRawMaterials,
            loadedOrders,
            loadedClients,
            loadedUsers,
            loadedPermissions
          ] = await Promise.all([
            productService.getAll().catch(() => []),
            rawMaterialService.getAll().catch(() => []),
            orderService.getAll().catch(() => []),
            clientService.getAll().catch(() => []),
            userService.getAll().catch(() => []),
            permissionService.get().catch(() => DEFAULT_USER_PERMISSIONS)
          ]);
          setProducts(loadedProducts);
          setRawMaterials(loadedRawMaterials);
          setOrders(loadedOrders);
          setClients(loadedClients);
          setUsers(loadedUsers);
          setUserPermissions(loadedPermissions);
        } catch (error) {
          console.error('Failed to fetch protected data:', error);
        }
      };
      fetchProtectedData();
    }
  }, [isAuthenticated]);

  // --- Persistence Effects Removed (Handled by API calls in functions) ---

  // Current User Persistence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Login function
  const login = async (usernameInput: string, passwordInput: string): Promise<boolean> => {
    try {
      const user = await authService.login({ username: usernameInput, password: passwordInput });
      if (user) {
        setCurrentUser(user);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'ECONNABORTED' || !error.response) {
        throw new Error('Servidor inacessível. Verifique sua conexão ou Firewall.');
      }
      throw new Error(error.response?.data?.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
    navigate('/login', { replace: true });
  };

  const updateCompanyInfo = async (name: string, logo: string | null): Promise<void> => {
    try {
      const updated = await companyService.update({ name, logo });
      setCompanyInfo(updated);
    } catch (error) {
      console.error('Failed to update company info:', error);
      throw error;
    }
  };

  const addProduct = async (product: Product): Promise<void> => {
    try {
      const { id, ...prodData } = product;
      const newProduct = await productService.create(prodData);
      setProducts((prev) => [...prev, newProduct]);
    } catch (error) {
      console.error('Failed to add product to Supabase:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct: Product): Promise<void> => {
    try {
      const result = await productService.update(updatedProduct.id, updatedProduct);
      setProducts((prev) =>
        prev.map((prod) => (prod.id === result.id ? result : prod))
      );
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((prod) => prod.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  };

  const addRawMaterial = async (rawMaterial: RawMaterial): Promise<void> => {
    try {
      const { id, ...data } = rawMaterial;
      const newRawMaterial = await rawMaterialService.create(data);
      setRawMaterials((prev) => [...prev, newRawMaterial]);
    } catch (error) {
      console.error('Failed to add raw material:', error);
      throw error;
    }
  };

  const updateRawMaterial = async (updatedRawMaterial: RawMaterial): Promise<void> => {
    try {
      const result = await rawMaterialService.update(updatedRawMaterial.id, updatedRawMaterial);
      setRawMaterials((prev) =>
        prev.map((rm) => (rm.id === result.id ? result : rm))
      );
    } catch (error) {
      console.error('Failed to update raw material:', error);
      throw error;
    }
  };

  const deleteRawMaterial = async (id: string): Promise<void> => {
    try {
      await rawMaterialService.delete(id);
      setRawMaterials((prev) => prev.filter((rm) => rm.id !== id));
    } catch (error) {
      console.error('Failed to delete raw material:', error);
      throw error;
    }
  };

  const addOrder = async (order: Order): Promise<Order> => {
    try {
      const { id, ...data } = order;
      // Filter out temporary IDs from nested items if they exist
      const orderData = {
        ...data,
        items: data.items.map(({ id: item_id, ...item }) => item),
        productionDetails: data.productionDetails?.map(({ id: prod_id, ...p }) => p)
      };

      const newOrder = await orderService.create(orderData as any);
      setOrders((prev) => [...prev, newOrder]);
      return newOrder;
    } catch (error) {
      console.error('Failed to add order to Supabase:', error);
      throw error;
    }
  };

  const updateOrder = async (updatedOrder: Order): Promise<void> => {
    try {
      const result = await orderService.update(updatedOrder.id, updatedOrder);
      setOrders((prev) =>
        prev.map((ord) => (ord.id === result.id ? result : ord))
      );
    } catch (error) {
      console.error('Failed to update order:', error);
      throw error;
    }
  };

  const deleteOrder = async (id: string): Promise<void> => {
    try {
      await orderService.delete(id);
      setOrders((prev) => prev.filter((ord) => ord.id !== id));
    } catch (error) {
      console.error('Failed to delete order:', error);
      throw error;
    }
  };

  const addClient = async (client: Client): Promise<void> => {
    try {
      const { id, ...data } = client;
      const newClient = await clientService.create(data);
      setClients((prev) => [...prev, newClient]);
    } catch (error) {
      console.error('Failed to add client:', error);
      throw error;
    }
  };

  const updateClient = async (updatedClient: Client): Promise<void> => {
    try {
      const result = await clientService.update(updatedClient.id, updatedClient);
      setClients((prev) =>
        prev.map((c) => (c.id === result.id ? result : c))
      );
    } catch (error) {
      console.error('Failed to update client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    try {
      await clientService.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete client:', error);
      throw error;
    }
  };

  // User management functions
  const registerUser = async (username: string, password: string, role: UserRole): Promise<void> => {
    try {
      const newUser = await authService.register({ username, password, role });
      setUsers((prev) => [...prev, newUser]);
      setIsInitialSetup(false);
    } catch (error) {
      console.error('Failed to register user:', error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: User): Promise<void> => {
    try {
      const result = await userService.update(updatedUser.id, updatedUser);
      setUsers((prev) =>
        prev.map((u) => (u.id === result.id ? result : u))
      );
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string): Promise<void> => {
    try {
      await userService.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (currentUser?.id === id) {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  // Function to update configurable permissions
  const updateUserPermissions = async (permissions: UserPermissions): Promise<void> => {
    try {
      const updated = await permissionService.update(permissions);
      setUserPermissions(updated);
    } catch (error) {
      console.error('Failed to update permissions:', error);
      throw error;
    }
  };

  // Helper function to check permissions based on user role and configuration
  const checkPermission = (permissionName: keyof UserPermissions): boolean => {
    if (currentUser?.role === UserRole.ADMIN) {
      return true; // Admins always have all permissions
    }
    if (currentUser?.role === UserRole.USER) {
      if (permissionName === 'key') return false;
      const permValue = userPermissions[permissionName as keyof UserPermissions];
      return typeof permValue === 'boolean' ? permValue : false;
    }
    return false; // Not authenticated
  };

  const value: any = { // Cast to any to avoid strict type mismatch during refactor if interface differs slightly
    isAuthenticated,
    isInitialSetup,
    connectionError,
    companyInfo,
    products,
    rawMaterials,
    orders,
    clients,
    users,
    currentUser,
    userPermissions,
    login,
    logout,
    updateCompanyInfo,
    addProduct,
    updateProduct,
    deleteProduct,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addOrder,
    updateOrder,
    deleteOrder,
    addClient,
    updateClient,
    deleteClient,
    registerUser,
    updateUser,
    deleteUser,
    updateUserPermissions,
    checkPermission,
    refreshData: loadData,
    apiUrl: api.defaults.baseURL
  };

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-indigo-600 text-xl font-semibold">
        Carregando dados...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="service-orders" element={<ServiceOrdersPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;