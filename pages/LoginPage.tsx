import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LogIn, User, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isInitialSetup, connectionError, companyInfo, registerUser, apiUrl } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError(null);
  }, [isInitialSetup]);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialSetup) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isInitialSetup, navigate]);

  const handleInitialSetupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!username.trim() || !password.trim()) {
        setError('Nome de usuário e senha são obrigatórios.');
        return;
      }

      await registerUser(username.trim(), password.trim(), 'admin' as any);
      const loginSuccess = await login(username.trim(), password.trim());

      if (loginSuccess) {
        navigate('/', { replace: true });
      } else {
        setError('Usuário criado, mas houve um erro ao entrar automaticamente.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao realizar a configuração inicial.');
      console.error('Setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!username.trim() || !password.trim()) {
        setError('Preencha todos os campos.');
        return;
      }

      await login(username.trim(), password.trim());
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout companyName={companyInfo.name} companyLogo={companyInfo.logo}>
      <div className="w-full max-w-md mx-auto">
        {isInitialSetup ? (
          <form onSubmit={handleInitialSetupSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-2">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Configuração de Acesso</h3>
              <p className="text-sm text-gray-500">
                Crie o primeiro usuário administrador para começar a usar o sistema.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <Input
                id="adminUsername"
                label="Novo Administrador"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin"
                required
                icon={<User className="h-5 w-5 text-gray-400" />}
              />
              <Input
                id="adminPassword"
                label="Senha de Acesso"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha forte"
                required
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />
            </div>

            {connectionError && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  O sistema está em modo offline ou o servidor não foi encontrado.
                  Verifique a conexão.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 text-center font-medium">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              isLoading={isLoading}
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              Criar e Entrar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">Acesse sua conta</h3>
              <p className="text-sm text-gray-500">
                Bem-vindo ao gerenciador de vendas
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <Input
                id="username"
                label="Usuário"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                icon={<User className="h-5 w-5 text-gray-400" />}
              />
              <Input
                id="password"
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                required
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />
            </div>

            {connectionError && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-800">Erro de Conexão</p>
                  <p className="text-xs text-red-700">
                    Não foi possível encontrar o servidor. Certifique-se de que o backend está rodando.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 text-center font-medium">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              isLoading={isLoading}
              icon={<LogIn className="h-5 w-5" />}
            >
              Entrar no Sistema
            </Button>

            <p className="text-center text-xs text-gray-400 pt-4">
              &copy; {new Date().getFullYear()} {companyInfo.name || 'Gerenciador de Vendas'}
            </p>
            <div className="mt-2 text-center text-[10px] text-gray-300 opacity-50">
              Conectado a: {apiUrl}
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};