import React from 'react';
import { useAuth } from '../App';
import { Button } from './Button';
import { LogOut, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const { companyInfo, logout, refreshData } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="flex-shrink-0 bg-white shadow-sm p-4 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center">
        {companyInfo.logo && (
          <img
            src={companyInfo.logo}
            alt="Company Logo"
            className="h-8 w-8 object-contain mr-3 rounded-full"
          />
        )}
        <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
          {companyInfo.name}
        </h1>
        <h1 className="text-xl font-semibold text-gray-800 block sm:hidden">
          {companyInfo.name.split(' ')[0]}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={handleRefresh}
          icon={<RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          disabled={isRefreshing}
          title="Sincronizar dados"
        >
          <span className="hidden md:inline">Sincronizar</span>
        </Button>
        <Button variant="ghost" onClick={logout} icon={<LogOut className="h-5 w-5" />}>
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
