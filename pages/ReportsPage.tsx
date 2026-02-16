import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { formatCurrency } from '../utils/currencyFormatter';
import { ReportCard } from '../components/ReportCard';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  DollarSign,
  FileText,
  Filter,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  ScrollText,
  Factory
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { OrderStatus, Order, UserRole } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Button } from '../components/Button';
import { GEMINI_MODEL_TEXT } from '../constants';

type ReportType = 'all' | 'sales' | 'production' | 'stock';

export const ReportsPage: React.FC = () => {
  const { products, orders, rawMaterials, companyInfo, currentUser, checkPermission } = useAuth();

  // --- States ---
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(lastMonthStr);
  const [endDate, setEndDate] = useState(today);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Permissions
  const canGenerateAISummary = checkPermission('canGenerateAISummary');

  // --- Data Filtering Logic ---
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders.filter(order => {
      if (!order || !order.createdAt) return false;
      try {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
      } catch (e) {
        console.warn(`Invalid date for order ${order.id}:`, order.createdAt);
        return false;
      }
    });
  }, [orders, startDate, endDate]);

  const filteredProducts = useMemo(() => products || [], [products]);

  // --- General Metrics ---
  const totalDirectSalesValue = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .reduce((sum, order) => sum + (parseFloat(order.total as any) || 0), 0);
  }, [filteredOrders]);

  const totalServiceOrdersValue = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .reduce((sum, order) => sum + (parseFloat(order.total as any) || 0), 0);
  }, [filteredOrders]);

  const totalBudgetsCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'budget').length;
  }, [filteredOrders]);

  const activeOrdersCount = useMemo(() => {
    return filteredOrders.filter(order =>
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
    ).length;
  }, [filteredOrders]);

  // --- Production Costs & Stock Value ---
  const totalFinishedProductsCostValue = useMemo(() => {
    return products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0);
  }, [products]);

  const totalProductionCosts = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) && order.productionDetails)
      .reduce((orderSum, order) => {
        const itemCosts = order.productionDetails ? order.productionDetails.reduce((itemSum, item) => {
          const qty = parseFloat(item.quantityUsed as any) || 0;
          const cost = parseFloat(item.costPerUnit as any) || 0;
          return itemSum + (qty * cost);
        }, 0) : 0;
        return orderSum + itemCosts;
      }, 0);
  }, [filteredOrders]);

  const totalRawMaterialValue = useMemo(() => {
    if (!rawMaterials) return 0;
    return rawMaterials.reduce((sum, item) => {
      const qty = parseFloat(item.quantity as any) || 0;
      const cost = parseFloat(item.costPerUnit as any) || 0;
      return sum + (qty * cost);
    }, 0);
  }, [rawMaterials]);

  // --- Sales by Month Chart Data (Direct Sales) ---
  const salesChartData = useMemo(() => {
    const dailyData: { [key: string]: number } = {};

    // Fill range
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dailyData[current.toISOString().split('T')[0]] = 0;
      current.setDate(current.getDate() + 1);
    }

    filteredOrders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
        if (dailyData.hasOwnProperty(dateKey)) {
          dailyData[dateKey] += order.total;
        }
      });

    return Object.entries(dailyData).map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      vendas: value
    }));
  }, [filteredOrders, startDate, endDate]);

  // --- Order Status Distribution ---
  const statusDistributionData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  }, [filteredOrders]);

  const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // --- Handlers ---
  const handlePrint = () => {
    window.print();
  };

  const handleGenerateSummary = async () => {
    if (!canGenerateAISummary) return;

    setIsGeneratingSummary(true);
    try {
      // In a real scenario, this would use a secure backend API. 
      // This is a front-end implementation for this specific project.
      const apiKey = localStorage.getItem('GEMINI_API_KEY');
      if (!apiKey) {
        alert('Por favor, configure sua chave de API Gemini no LocalStorage ou Configurações para usar esta função.');
        setIsGeneratingSummary(false);
        return;
      }

      const genAI = new GoogleGenAI({ apiKey });

      const prompt = `
        Aja como um consultor de business intelligence para uma empresa de confecção chamada "${companyInfo.name}".
        Analise os seguintes dados do período de ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')} (Tipo de Relatório: ${reportType}):
        - Vendas Diretas: ${formatCurrency(totalDirectSalesValue)}
        - Ordens de Serviço: ${formatCurrency(totalServiceOrdersValue)}
        - Custos de Produção: ${formatCurrency(totalProductionCosts)}
        - Valor em Estoque (Produtos): ${formatCurrency(totalFinishedProductsCostValue)}
        - Valor em Estoque (Matéria-Prima): ${formatCurrency(totalRawMaterialValue)}
        - Orçamentos Gerados: ${totalBudgetsCount}
        - Pedidos Ativos (Não concluídos/cancelados): ${activeOrdersCount}

        Forneça um parágrafo de resumo executivo curto, destacando o desempenho financeiro, a saúde do estoque e uma recomendação acionável. 
        Seja profissional e conciso. Use Português do Brasil.
      `;

      const response = await genAI.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Falha ao gerar resumo: Resposta vazia.');

      setAiSummary(text);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      alert('Falha ao gerar o resumo. Verifique sua chave de API.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with hidden print-only info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Relatórios Executivos</h2>
          <p className="text-gray-500 mt-1">Análise detalhada do desempenho da sua confecção.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer className="h-5 w-5" />}
          >
            Imprimir
          </Button>
          {canGenerateAISummary && (
            <Button
              variant="primary"
              onClick={handleGenerateSummary}
              isLoading={isGeneratingSummary}
              icon={<Sparkles className="h-5 w-5" />}
            >
              Resumo IA
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-gray-200 rounded-lg text-sm focus:ring-indigo-500"
          />
          <span className="text-gray-400">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-gray-200 rounded-lg text-sm focus:ring-indigo-500"
          />
        </div>

        <div className="h-6 w-px bg-gray-200 hidden md:block" />

        <div className="flex items-center gap-2 flex-grow md:flex-grow-0">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="border-gray-200 rounded-lg text-sm focus:ring-indigo-500 bg-white"
          >
            <option value="all">Visão Geral</option>
            <option value="sales">Vendas e Faturamento</option>
            <option value="production">Produção e Custos</option>
            <option value="stock">Estoque e Inventário</option>
          </select>
        </div>
      </div>

      {/* AI Summary Section */}
      {aiSummary && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl animate-fade-in print:bg-white print:border-gray-300">
          <div className="flex items-center gap-2 mb-2 text-indigo-700 font-semibold">
            <Sparkles className="h-5 w-5" />
            <span>Análise Assistida por IA</span>
          </div>
          <p className="text-indigo-900 leading-relaxed italic">
            "{aiSummary}"
          </p>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(reportType === 'all' || reportType === 'sales') && (
          <>
            <ReportCard
              title="Vendas Diretas"
              value={formatCurrency(totalDirectSalesValue)}
              icon={<TrendingUp className="h-6 w-6" />}
              color="blue"
              description="Faturamento de vendas concluídas no PDV."
            />
            <ReportCard
              title="Ordens de Serviço"
              value={formatCurrency(totalServiceOrdersValue)}
              icon={<ScrollText className="h-6 w-6" />}
              color="green"
              description="Valor de serviços entregues."
            />
          </>
        )}
        {(reportType === 'all' || reportType === 'production') && (
          <ReportCard
            title="Custos de Produção"
            value={formatCurrency(totalProductionCosts)}
            icon={<Factory className="h-6 w-6" />}
            color="red"
            description="Matéria-prima e mão de obra aplicada."
          />
        )}
        {(reportType === 'all' || reportType === 'stock') && (
          <ReportCard
            title="Inventário (Produtos)"
            value={formatCurrency(totalFinishedProductsCostValue)}
            icon={<Package className="h-6 w-6" />}
            color="purple"
            description="Valor total em produtos prontos."
          />
        )}
        {reportType === 'all' && (
          <>
            <ReportCard
              title="Orçamentos Ativos"
              value={totalBudgetsCount}
              icon={<FileText className="h-6 w-6" />}
              color="yellow"
              description="Propostas comerciais enviadas."
            />
            <ReportCard
              title="Matéria-Prima"
              value={formatCurrency(totalRawMaterialValue)}
              icon={<Layers className="h-6 w-6" />}
              color="orange"
              description="Valor total de insumos no estoque."
            />
          </>
        )}
      </div>

      {/* Detailed Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Tendência de Vendas (Diária)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `R$${val}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            Distribuição de Status
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistributionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section: Recent Large Orders (Example of detailed info) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Maiores Operações do Período</h3>
          <span className="text-xs font-medium text-gray-400">Total de {filteredOrders.length} registros no período</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredOrders
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.type === 'sale' ? 'Venda PDV' : order.type === 'service-order' ? 'Prod. Sob Medida' : 'Orçamento'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                    Nenhuma operação encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info for Print */}
      <div className="hidden print:block text-center text-xs text-gray-400 pt-8 mt-8 border-t border-gray-100">
        Relatório gerado em {new Date().toLocaleString()} | {companyInfo.name} | Gerenciador Profissional de Confecções
      </div>
    </div>
  );
};
