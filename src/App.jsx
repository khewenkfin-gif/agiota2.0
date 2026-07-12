import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { formatYen, isDelayed, SYSTEM_REF_DATE } from './utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  History, 
  Plus, 
  Minus, 
  Briefcase, 
  Layers, 
  Percent, 
  Menu, 
  X,
  UserCheck,
  UserPlus,
  PiggyBank,
  Info,
  LogOut
} from 'lucide-react';

function App() {
  // --- APPLICATION STATE ---
  const [loans, setLoans] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Active Tab: 'operacao' | 'contratos' | 'contribuintes' | 'dashboard'
  const [activeTab, setActiveTab] = useState('operacao');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- NOTIFICATION BANNER STATE ---
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- FORM STATES ---
  // 1. Novo Empréstimo
  const [newLoanClient, setNewLoanClient] = useState('');
  const [newLoanValue, setNewLoanValue] = useState('');
  const [newLoanInterest, setNewLoanInterest] = useState('');
  const [newLoanDueDate, setNewLoanDueDate] = useState('');

  // 2. Registrar Pagamento
  const [payLoanId, setPayLoanId] = useState('');
  const [payValue, setPayValue] = useState('');

  // 3. Alterar Juros / Penalidade
  const [rateLoanId, setRateLoanId] = useState('');
  const [rateNewValue, setRateNewValue] = useState('');

  // 4. Pagar Parcela ao Acionista
  const [payInvestorId, setPayInvestorId] = useState('');

  // 5. Novo Financiamento (Investidor)
  const [newInvName, setNewInvName] = useState('');
  const [newInvValue, setNewInvValue] = useState('');
  const [newInvParcelas, setNewInvParcelas] = useState('');
  const [newInvValorParcela, setNewInvValorParcela] = useState('');
  const [newInvNoDate, setNewInvNoDate] = useState(false);
  const [newInvDate, setNewInvDate] = useState('');

  // 6. Movimentar Caixa
  const [moveType, setMoveType] = useState('aporte');
  const [moveValue, setMoveValue] = useState('');

  // 7. Filtro de Tempo (Dashboard)
  const [timeFilter, setTimeFilter] = useState('todo'); // 'atual' | 'anterior' | 'todo'

  // 8. Busca de Contratos
  const [searchContractQuery, setSearchContractQuery] = useState('');

  // 9. Modal de Edição de Contrato
  const [editingLoan, setEditingLoan] = useState(null);

  // --- DYNAMIC DATES FOR LABELS ---
  const getMonthName = (monthStr) => {
    const months = {
      '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
      '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
      '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
    };
    return months[monthStr] || monthStr;
  };

  // --- Date Helper ---
  const addOneMonth = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    date.setMonth(date.getMonth() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // --- LOAD DATA FROM SUPABASE ---
  const carregarDados = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    try {
      const [resEmp, resCon, resCai, resLog] = await Promise.all([
        supabase.from('emprestimos').select('*').order('data_registro', { ascending: false }),
        supabase.from('contribuintes').select('*').order('id', { ascending: true }),
        supabase.from('caixa').select('*').order('data_aporte', { ascending: false }),
        supabase.from('logs').select('*').order('data_pagamento', { ascending: false })
      ]);

      if (resEmp.error) throw resEmp.error;
      if (resCon.error) throw resCon.error;
      if (resCai.error) throw resCai.error;
      if (resLog.error) throw resLog.error;

      const dbEmprestimos = resEmp.data || [];
      const dbContribuintes = resCon.data || [];
      const dbCaixa = resCai.data || [];
      const dbLogs = resLog.data || [];

      // Map Empréstimos
      const mappedLoans = dbEmprestimos.map(l => ({
        id: l.id,
        client: l.cliente,
        valueOriginal: Number(l.valor_inicial),
        interest: Number(l.juros),
        dueDate: l.vencimento,
        balance: Number(l.saldo_devedor),
        status: l.status,
        isActive: l.status !== 'pago',
        dateCreated: l.data_registro ? l.data_registro.split('T')[0] : ''
      }));

      // Map Contribuintes
      const mappedInvestors = dbContribuintes.map(c => ({
        id: c.id,
        name: c.nome,
        value: Number(c.valor_solicitado),
        percentage: Number(c.porcentagem),
        date: c.data_acordo,
        qtdParcelas: Number(c.qtd_parcelas),
        parcelasPagas: Number(c.parcelas_pagas),
        valorParcela: Number(c.valor_parcela)
      }));

      // Map Payment Logs
      const mappedPaymentLogs = dbLogs.map(log => {
        const loan = dbEmprestimos.find(l => l.id === log.linha_cliente);
        return {
          id: log.id,
          rowClient: log.linha_cliente,
          clientName: loan ? loan.cliente : 'Cliente Desconhecido',
          date: log.data_pagamento ? log.data_pagamento.split('T')[0] : '',
          value: Number(log.valor_pago),
          saldoAnterior: Number(log.saldo_anterior),
          novaParcela: Number(log.nova_parcela)
        };
      });

      // Map Cash Flow
      const mappedCashFlow = dbCaixa.map(c => ({
        id: c.id,
        date: c.data_aporte ? c.data_aporte.split('T')[0] : '',
        value: Number(c.valor)
      }));

      setLoans(mappedLoans);
      setInvestors(mappedInvestors);
      setPaymentLogs(mappedPaymentLogs);
      setCashFlow(mappedCashFlow);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados do banco de dados.', 'error');
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        carregarDados();
      } else {
        setLoading(false);
      }
    });

    // Ouvir mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        carregarDados(false);
      } else {
        // Limpar dados ao deslogar
        setLoans([]);
        setInvestors([]);
        setCashFlow([]);
        setPaymentLogs([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- CALCULATION HELPER FUNCTIONS ---
  
  // Available Cash (Dynamic)
  // Calcule o "Em Caixa Disponível" dinamicamente somando os valores de 'caixa' e 'logs' (pagamentos) e subtraindo o 'valor_inicial' de todos os empréstimos cadastrados.
  const cashBalance = (() => {
    const totalCaixa = cashFlow.reduce((acc, curr) => acc + curr.value, 0);
    const totalPayments = paymentLogs.reduce((acc, curr) => acc + curr.value, 0);
    const totalLoansOriginal = loans.reduce((acc, curr) => acc + curr.valueOriginal, 0);
    return totalCaixa + totalPayments - totalLoansOriginal;
  })();

  // Capital on the Street (Sum of active loan balances)
  const capitalOnStreet = loans
    .filter(loan => loan.isActive)
    .reduce((acc, curr) => acc + curr.balance, 0);

  // Expected Interest to Receive
  const totalAccruedInterest = loans
    .filter(loan => loan.isActive)
    .reduce((acc, curr) => {
      const profit = curr.balance - curr.valueOriginal;
      return acc + (profit > 0 ? profit : 0);
    }, 0);

  // Overdue Loans List
  const overdueLoans = loans.filter(loan => isDelayed(loan.dueDate, loan.isActive));

  // Next 5 upcoming loans
  const upcomingLoans = loans
    .filter(loan => loan.isActive && !isDelayed(loan.dueDate, loan.isActive))
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 5);

  // --- ACTIONS ---

  // Create Loan
  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!newLoanClient || !newLoanValue || !newLoanInterest || !newLoanDueDate) {
      showToast('Por favor, preencha todos os campos do empréstimo.', 'error');
      return;
    }

    const value = parseFloat(newLoanValue);
    const interest = parseFloat(newLoanInterest);

    if (value <= 0 || interest < 0) {
      showToast('Valores devem ser maiores que zero.', 'error');
      return;
    }

    // Check cash availability
    if (value > cashBalance) {
      showToast('Saldo em caixa insuficiente para realizar este empréstimo.', 'error');
      return;
    }

    const initialBalance = value * (1 + interest / 100);

    try {
      const { error } = await supabase.from('emprestimos').insert([
        {
          cliente: newLoanClient,
          valor_inicial: value,
          juros: interest,
          vencimento: newLoanDueDate,
          saldo_devedor: initialBalance,
          status: 'em_dia',
          data_registro: new Date().toISOString()
        }
      ]);

      if (error) throw error;

      // Reset fields
      setNewLoanClient('');
      setNewLoanValue('');
      setNewLoanInterest('');
      setNewLoanDueDate('');

      showToast(`Empréstimo de ${formatYen(value)} registrado com sucesso!`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar o empréstimo no banco de dados.', 'error');
    }
  };

  // Register Payment
  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!payLoanId || !payValue) {
      showToast('Selecione um contrato e informe o valor recebido.', 'error');
      return;
    }

    const valueReceived = parseFloat(payValue);
    const loan = loans.find(l => l.id === parseInt(payLoanId));

    if (!loan) {
      showToast('Contrato não encontrado.', 'error');
      return;
    }

    if (valueReceived <= 0) {
      showToast('O valor recebido deve ser maior que zero.', 'error');
      return;
    }

    const interestRate = loan.interest;
    const currentBalance = loan.balance;

    let nextBalance = 0;
    let isFullyPaid = false;
    let nextDueDate = loan.dueDate;

    if (valueReceived >= currentBalance) {
      nextBalance = 0;
      isFullyPaid = true;
    } else {
      const remaining = currentBalance - valueReceived;
      nextBalance = remaining * (1 + interestRate / 100);
      nextDueDate = addOneMonth(loan.dueDate);
    }

    try {
      // 1. Insert into logs
      const { error: logErr } = await supabase.from('logs').insert([
        {
          linha_cliente: loan.id,
          data_pagamento: new Date().toISOString(),
          valor_pago: valueReceived,
          saldo_anterior: currentBalance,
          nova_parcela: nextBalance
        }
      ]);
      if (logErr) throw logErr;

      // 2. Update loan status, balance, vencimento
      const { error: empErr } = await supabase.from('emprestimos').update({
        saldo_devedor: nextBalance,
        status: isFullyPaid ? 'pago' : loan.status,
        vencimento: nextDueDate
      }).eq('id', loan.id);
      if (empErr) throw empErr;

      setPayValue('');
      if (isFullyPaid) {
        setPayLoanId('');
      }

      showToast(`Pagamento de ${formatYen(valueReceived)} registrado para ${loan.client}! ${isFullyPaid ? 'Contrato quitado!' : ''}`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar o pagamento no banco de dados.', 'error');
    }
  };

  // Alter Interest
  const handleUpdateInterest = async (e) => {
    e.preventDefault();
    if (!rateLoanId || !rateNewValue) {
      showToast('Selecione o contrato e defina a nova taxa.', 'error');
      return;
    }

    const newRate = parseFloat(rateNewValue);
    const loan = loans.find(l => l.id === parseInt(rateLoanId));

    if (!loan) return;
    if (newRate < 0) {
      showToast('A taxa de juros não pode ser negativa.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('emprestimos').update({
        juros: newRate
      }).eq('id', loan.id);

      if (error) throw error;

      setRateNewValue('');
      showToast(`Taxa de juros de ${loan.client} alterada para ${newRate}% a.m.`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar taxa de juros no banco de dados.', 'error');
    }
  };

  // Pay Investor Share
  const handlePayInvestor = async (e) => {
    e.preventDefault();
    if (!payInvestorId) {
      showToast('Selecione um investidor ativo.', 'error');
      return;
    }

    const investor = investors.find(i => i.id === parseInt(payInvestorId));
    if (!investor) return;

    if (investor.parcelasPagas >= investor.qtdParcelas) {
      showToast('Este investidor já está totalmente pago.', 'error');
      return;
    }

    if (cashBalance < investor.valorParcela) {
      showToast('Caixa insuficiente para pagar a parcela deste investidor.', 'error');
      return;
    }

    try {
      // 1. Update contributor
      const { error: invErr } = await supabase.from('contribuintes').update({
        parcelas_pagas: investor.parcelasPagas + 1
      }).eq('id', investor.id);
      if (invErr) throw invErr;

      // 2. Insert payout in caixa
      const { error: cashErr } = await supabase.from('caixa').insert([
        {
          data_aporte: new Date().toISOString(),
          valor: -investor.valorParcela
        }
      ]);
      if (cashErr) throw cashErr;

      showToast(`Parcela de ${formatYen(investor.valorParcela)} paga com sucesso para ${investor.name}!`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao processar pagamento de parcela no banco de dados.', 'error');
    }
  };

  // Add Investor Contribution
  const handleAddInvestor = async (e) => {
    e.preventDefault();
    if (!newInvName || !newInvValue || !newInvParcelas || !newInvValorParcela) {
      showToast('Preencha os campos obrigatórios do investidor.', 'error');
      return;
    }

    const valSolicitado = parseFloat(newInvValue);
    const parcelas = parseInt(newInvParcelas);
    const valParcela = parseFloat(newInvValorParcela);

    if (valSolicitado <= 0 || parcelas <= 0 || valParcela <= 0) {
      showToast('Valores devem ser maiores que zero.', 'error');
      return;
    }

    const dataAcordo = newInvNoDate ? 'Sem data fixada' : (newInvDate || SYSTEM_REF_DATE);

    try {
      // 1. Insert contributor
      const { error: invErr } = await supabase.from('contribuintes').insert([
        {
          nome: newInvName,
          valor_solicitado: valSolicitado,
          porcentagem: 10,
          data_acordo: dataAcordo,
          qtd_parcelas: parcelas,
          parcelas_pagas: 0,
          valor_parcela: valParcela
        }
      ]);
      if (invErr) throw invErr;

      // 2. Insert contribution in caixa
      const { error: cashErr } = await supabase.from('caixa').insert([
        {
          data_aporte: new Date().toISOString(),
          valor: valSolicitado
        }
      ]);
      if (cashErr) throw cashErr;

      // Reset fields
      setNewInvName('');
      setNewInvValue('');
      setNewInvParcelas('');
      setNewInvValorParcela('');
      setNewInvDate('');
      setNewInvNoDate(false);

      showToast(`Capital de ${formatYen(valSolicitado)} captado do investidor ${newInvName}!`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar investidor no banco de dados.', 'error');
    }
  };

  // Move Cash Manually
  const handleMoveCash = async (e) => {
    e.preventDefault();
    if (!moveValue) {
      showToast('Preencha o valor da movimentação.', 'error');
      return;
    }

    const value = parseFloat(moveValue);
    if (value <= 0) {
      showToast('O valor deve ser maior que zero.', 'error');
      return;
    }

    const isAporte = moveType === 'aporte';
    const finalValue = isAporte ? value : -value;

    if (!isAporte && Math.abs(finalValue) > cashBalance) {
      showToast('Saldo insuficiente em caixa para realizar retirada.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('caixa').insert([
        {
          data_aporte: new Date().toISOString(),
          valor: finalValue
        }
      ]);

      if (error) throw error;

      setMoveValue('');
      showToast(`${isAporte ? 'Aporte' : 'Retirada'} de ${formatYen(value)} realizado com sucesso!`);
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao movimentar caixa no banco de dados.', 'error');
    }
  };

  // Edit Contract Submit
  const handleEditLoanSubmit = async (e) => {
    e.preventDefault();
    if (!editingLoan.client || !editingLoan.valueOriginal || !editingLoan.balance || !editingLoan.interest || !editingLoan.dueDate) {
      showToast('Preencha todos os campos do contrato.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('emprestimos').update({
        cliente: editingLoan.client,
        valor_inicial: parseFloat(editingLoan.valueOriginal),
        saldo_devedor: parseFloat(editingLoan.balance),
        juros: parseFloat(editingLoan.interest),
        vencimento: editingLoan.dueDate
      }).eq('id', editingLoan.id);

      if (error) throw error;

      setEditingLoan(null);
      showToast('Contrato atualizado com sucesso!');
      await carregarDados(false);

    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar contrato no banco de dados.', 'error');
    }
  };

  // --- FILTERED ZONES FOR HISTÓRICO ---
  const filterByTime = (itemDate) => {
    if (timeFilter === 'atual') {
      return itemDate.startsWith('2026-07');
    } else if (timeFilter === 'anterior') {
      return itemDate.startsWith('2026-06');
    }
    return true; // Todo o período
  };

  const filteredLoans = loans.filter(loan => filterByTime(loan.dateCreated));
  const filteredPayments = paymentLogs.filter(pay => filterByTime(pay.date));

  const totalLentInPeriod = filteredLoans.reduce((acc, curr) => acc + curr.valueOriginal, 0);
  const totalReceivedInPeriod = filteredPayments.reduce((acc, curr) => acc + curr.value, 0);

  // --- SELECTED LOAN PREVIEW LOGIC ---
  const selectedLoanForPay = loans.find(l => l.id === parseInt(payLoanId));
  const previewValue = parseFloat(payValue) || 0;
  const previewRemaining = selectedLoanForPay 
    ? Math.max(0, selectedLoanForPay.balance - previewValue)
    : 0;
  const previewNextInstallment = selectedLoanForPay 
    ? previewRemaining * (1 + selectedLoanForPay.interest / 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-accent-blue/20 border-t-accent-blue animate-spin"></div>
            <TrendingUp className="h-6 w-6 text-accent-blue absolute animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white tracking-wide">CrediDash</h3>
            <p className="text-sm text-gray-400 mt-1 animate-pulse">Sincronizando com o Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen showToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col md:flex-row">
      
      {/* --- NOTIFICATION TOAST --- */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 border ${
          notification.type === 'error' 
            ? 'bg-red-950/80 border-accent-red text-red-200' 
            : 'bg-emerald-950/80 border-accent-green text-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="h-5 w-5 text-accent-red" /> : <CheckCircle className="h-5 w-5 text-accent-green" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* --- SIDEBAR DE NAVEGAÇÃO --- */}
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-sidebar border-r border-dark-border p-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
            <TrendingUp className="h-6 w-6 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">CrediDash</h1>
            <span className="text-[10px] text-gray-500 font-mono">Ref: {SYSTEM_REF_DATE}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('operacao')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'operacao'
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Operação Diária</span>
          </button>
          <button
            onClick={() => setActiveTab('contratos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'contratos'
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Contratos Ativos</span>
          </button>
          <button
            onClick={() => setActiveTab('contribuintes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'contribuintes'
                ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20'
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Contribuintes</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200 border border-transparent'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Dashboard & Histórico</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-dark-border mt-auto flex flex-col gap-3">
          <div className="bg-dark-card rounded-xl p-4 border border-dark-border text-center">
            <span className="text-xs text-gray-400 block mb-1">Moeda Padrão</span>
            <span className="text-sm font-bold text-white font-mono flex items-center justify-center gap-1">
              Japão (JPY - ¥)
            </span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top/Horizontal Menu */}
      <header className="md:hidden bg-dark-sidebar border-b border-dark-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-accent-blue" />
          <span className="text-lg font-bold text-white">CrediDash</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-dark-sidebar border-b border-dark-border p-4 flex flex-col gap-2 z-30 sticky top-[61px]">
          <button
            onClick={() => { setActiveTab('operacao'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'operacao' ? 'bg-accent-blue/10 text-accent-blue' : 'text-gray-400'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Operação Diária</span>
          </button>
          <button
            onClick={() => { setActiveTab('contratos'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'contratos' ? 'bg-accent-green/10 text-accent-green' : 'text-gray-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Contratos Ativos</span>
          </button>
          <button
            onClick={() => { setActiveTab('contribuintes'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'contribuintes' ? 'bg-accent-purple/10 text-accent-purple' : 'text-gray-400'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Contribuintes</span>
          </button>
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Dashboard & Histórico</span>
          </button>
          <div className="border-t border-dark-border my-2 pt-2">
            <button
              onClick={() => { supabase.auth.signOut(); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full text-left cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === 'operacao' && 'Gestão de Operação Diária'}
              {activeTab === 'contratos' && 'Todos os Contratos Ativos'}
              {activeTab === 'contribuintes' && 'Gestão de Capital de Investidores'}
              {activeTab === 'dashboard' && 'Dashboard Analítico & Histórico'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab === 'operacao' && 'Concessão de crédito, recebimento de parcelas e liquidações.'}
              {activeTab === 'contratos' && 'Visão geral consolidada dos contratos correntes na rua.'}
              {activeTab === 'contribuintes' && 'Acompanhamento de cotas de investidores e sobra líquida corporativa.'}
              {activeTab === 'dashboard' && 'Monitoramento de fluxo de caixa operacional e demonstrativos.'}
            </p>
          </div>

          {/* Quick Cash Status */}
          <div className="bg-dark-card border border-dark-border rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="p-3 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
              <PiggyBank className="h-6 w-6 text-accent-blue" />
            </div>
            <div>
              <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Caixa Disponível</span>
              <span className="text-xl font-bold font-mono text-white">{formatYen(cashBalance)}</span>
            </div>
          </div>
        </div>

        {/* --- TAB 1: OPERAÇÃO --- */}
        {activeTab === 'operacao' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna 1: Novo Empréstimo & Atrasados */}
            <div className="space-y-6">
              {/* Form Novo Empréstimo */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="h-5 w-5 text-accent-blue" />
                  <h3 className="text-lg font-bold text-white">Novo Empréstimo</h3>
                </div>
                <form onSubmit={handleCreateLoan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nome do Cliente</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Yuki Tanaka"
                      value={newLoanClient}
                      onChange={(e) => setNewLoanClient(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Valor Solicitado (¥)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 font-mono text-sm">¥</span>
                      <input 
                        type="number" 
                        placeholder="Ex: 500000"
                        value={newLoanValue}
                        onChange={(e) => setNewLoanValue(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Juros a.m. (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="Ex: 5"
                        value={newLoanInterest}
                        onChange={(e) => setNewLoanInterest(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Vencimento</label>
                      <input 
                        type="date"
                        value={newLoanDueDate}
                        onChange={(e) => setNewLoanDueDate(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-blue/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Conceder Empréstimo</span>
                  </button>
                </form>
              </div>

              {/* Card Atrasados */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-accent-red" />
                    <h3 className="text-lg font-bold text-white">Contratos Atrasados</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-accent-red/20 text-accent-red border border-accent-red/30">
                    {overdueLoans.length}
                  </span>
                </div>

                {overdueLoans.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border border-dashed border-dark-border rounded-xl">
                    <CheckCircle className="h-8 w-8 text-accent-green mx-auto mb-2 opacity-55" />
                    <p className="text-sm font-medium">Nenhum contrato em atraso!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {overdueLoans.map(loan => (
                      <div key={loan.id} className="flex justify-between items-center p-3 rounded-xl bg-dark-bg border border-dark-border hover:border-accent-red/30 transition-all">
                        <div>
                          <span className="text-sm font-bold text-gray-200 block">{loan.client}</span>
                          <span className="text-xs text-gray-500 font-mono">Venceu em: {loan.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-accent-red">{formatYen(loan.balance)}</span>
                          <span className="text-[10px] text-gray-400 block font-mono">{loan.interest}% juros</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Registrar Pagamento & Alterar Taxa */}
            <div className="space-y-6">
              {/* Registrar Pagamento */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-accent-green" />
                  <h3 className="text-lg font-bold text-white">Registrar Pagamento</h3>
                </div>
                <form onSubmit={handleRegisterPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Contrato Ativo</label>
                    <select 
                      value={payLoanId}
                      onChange={(e) => setPayLoanId(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-medium"
                    >
                      <option value="">Selecione o Cliente</option>
                      {loans.filter(l => l.isActive).map(loan => (
                        <option key={loan.id} value={loan.id}>
                          {loan.client} - Saldo: {formatYen(loan.balance)} ({loan.interest}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Valor Recebido (¥)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 font-mono text-sm">¥</span>
                      <input 
                        type="number" 
                        placeholder="Ex: 100000"
                        value={payValue}
                        onChange={(e) => setPayValue(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-mono"
                      />
                    </div>
                  </div>

                  {/* PREVIEW EM TEMPO REAL */}
                  {selectedLoanForPay && payValue && (
                    <div className="border border-dashed border-accent-green/40 bg-accent-green/5 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-accent-green text-xs font-bold uppercase tracking-wider mb-1">
                        <Info className="h-3.5 w-3.5" />
                        <span>Simulação de Saldo</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Saldo Restante:</span>
                        <span className="font-bold font-mono text-white">{formatYen(previewRemaining)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Próxima Parcela (com +{selectedLoanForPay.interest}% juros):</span>
                        <span className="font-bold font-mono text-accent-green">{formatYen(previewNextInstallment)}</span>
                      </div>
                      {previewRemaining <= 0 && (
                        <div className="mt-2 text-[11px] font-semibold text-accent-green bg-accent-green/10 py-1 px-2.5 rounded-lg border border-accent-green/20 text-center">
                          🎉 Este pagamento quita integralmente a dívida.
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-accent-green hover:bg-accent-green/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-green/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirmar Recebimento</span>
                  </button>
                </form>
              </div>

              {/* Form Alterar Juros / Penalidades */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="h-5 w-5 text-accent-purple" />
                  <h3 className="text-lg font-bold text-white">Alterar Juros / Penalidade</h3>
                </div>
                <form onSubmit={handleUpdateInterest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Cliente Alvo</label>
                    <select 
                      value={rateLoanId}
                      onChange={(e) => setRateLoanId(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-medium"
                    >
                      <option value="">Selecione o Cliente</option>
                      {loans.filter(l => l.isActive).map(loan => (
                        <option key={loan.id} value={loan.id}>
                          {loan.client} (Taxa atual: {loan.interest}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nova Taxa Mensal (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="Ex: 7.5"
                      value={rateNewValue}
                      onChange={(e) => setRateNewValue(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-mono"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-purple/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Percent className="h-4 w-4" />
                    <span>Aplicar Nova Taxa</span>
                  </button>
                </form>
              </div>

            </div>

            {/* Coluna 3: Pagar Parcela ao Acionista & Agenda de Vencimentos */}
            <div className="space-y-6">
              {/* Pagar Parcela ao Acionista */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="h-5 w-5 text-accent-purple" />
                  <h3 className="text-lg font-bold text-white">Pagar Parcela a Investidor</h3>
                </div>
                <form onSubmit={handlePayInvestor} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Acionista Credor</label>
                    <select 
                      value={payInvestorId}
                      onChange={(e) => setPayInvestorId(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-medium"
                    >
                      <option value="">Selecione o Investidor</option>
                      {investors.filter(i => i.parcelasPagas < i.qtdParcelas).map(investor => (
                        <option key={investor.id} value={investor.id}>
                          {investor.name} - Parcela: {formatYen(investor.valorParcela)} ({investor.parcelasPagas}/{investor.qtdParcelas})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {payInvestorId && (
                    <div className="bg-gray-800/40 border border-dark-border rounded-xl p-4 text-xs space-y-2">
                      {(() => {
                        const inv = investors.find(i => i.id === parseInt(payInvestorId));
                        if (!inv) return null;
                        const total = inv.qtdParcelas * inv.valorParcela;
                        const pago = inv.parcelasPagas * inv.valorParcela;
                        return (
                          <>
                            <div className="flex justify-between"><span className="text-gray-400">Capital Solicitado:</span> <span className="font-semibold text-white">{formatYen(inv.value)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Total a Pagar Pactuado:</span> <span className="font-semibold text-white">{formatYen(total)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Total Pago até hoje:</span> <span className="font-semibold text-accent-green">{formatYen(pago)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Próximo Débito:</span> <span className="font-bold text-accent-purple font-mono">{formatYen(inv.valorParcela)}</span></div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-purple/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Baixar 1 Parcela</span>
                  </button>
                </form>
              </div>

              {/* Agenda de Vencimentos */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-accent-blue" />
                  <h3 className="text-lg font-bold text-white">Agenda de Vencimentos</h3>
                </div>
                
                {upcomingLoans.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border border-dashed border-dark-border rounded-xl">
                    <p className="text-sm">Nenhum vencimento futuro agendado.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingLoans.map(loan => {
                      const [, mm, dd] = loan.dueDate.split('-');
                      const mesAbreviado = getMonthName(mm);
                      return (
                        <div key={loan.id} className="flex items-center gap-4">
                          {/* Bloco de Data Estilizado em Azul/Roxo */}
                          <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple text-white font-bold flex-shrink-0 shadow-md">
                            <span className="text-[10px] leading-tight opacity-90">{mesAbreviado}</span>
                            <span className="text-lg leading-tight font-mono">{dd}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-white block truncate">{loan.client}</span>
                            <span className="text-xs text-gray-400 block font-mono">Saldo: {formatYen(loan.balance)}</span>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-accent-green/10 text-accent-green border border-accent-green/20">
                            Em dia
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: TODOS OS CONTRATOS ATIVOS --- */}
        {activeTab === 'contratos' && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="w-full sm:max-w-xs">
                <input 
                  type="text" 
                  placeholder="Pesquisar cliente..."
                  value={searchContractQuery}
                  onChange={(e) => setSearchContractQuery(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-green/50"
                />
              </div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Total de Contratos Ativos: {loans.filter(l => l.isActive).length}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-4">Cliente</th>
                    <th className="py-4 px-4 text-right">Capital Original</th>
                    <th className="py-4 px-4 text-right">Saldo Atual</th>
                    <th className="py-4 px-4 text-center">Taxa</th>
                    <th className="py-4 px-4 text-right">Juros Acumulados</th>
                    <th className="py-4 px-4 text-center">Vencimento</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40 text-sm">
                  {loans
                    .filter(loan => {
                      const matchesSearch = loan.client.toLowerCase().includes(searchContractQuery.toLowerCase());
                      return loan.isActive && matchesSearch;
                    })
                    .map(loan => {
                      const delayed = isDelayed(loan.dueDate, loan.isActive);
                      const accruedInterest = loan.balance - loan.valueOriginal;

                      return (
                        <tr key={loan.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="py-4 px-4 font-bold text-white">{loan.client}</td>
                          <td className="py-4 px-4 text-right font-mono">{formatYen(loan.valueOriginal)}</td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-accent-green">{formatYen(loan.balance)}</td>
                          <td className="py-4 px-4 text-center font-mono">{loan.interest}%</td>
                          <td className="py-4 px-4 text-right font-mono text-accent-purple font-semibold">
                            {formatYen(accruedInterest)}
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-gray-300">{loan.dueDate}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                              delayed 
                                ? 'bg-accent-red/10 border-accent-red/20 text-accent-red' 
                                : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                            }`}>
                              {delayed ? 'Atrasado' : 'Em dia'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => setEditingLoan({ ...loan })}
                              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-dark-border cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold">Editar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {loans.filter(l => l.isActive && l.client.toLowerCase().includes(searchContractQuery.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-gray-500 font-medium">
                        Nenhum contrato ativo corresponde à pesquisa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* --- TAB 3: CONTRIBUINTES --- */}
        {activeTab === 'contribuintes' && (
          <div className="space-y-6">
            
            {/* Top 3 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* KPI 1 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Captação Acumulada</span>
                  <span className="text-2xl font-bold font-mono text-white">
                    {formatYen(investors.reduce((acc, curr) => acc + curr.value, 0))}
                  </span>
                </div>
                <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
                  <TrendingUp className="h-6 w-6 text-accent-blue" />
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Lucro Vermelho Total (Custo Juros)</span>
                  <span className="text-2xl font-bold font-mono text-accent-red">
                    {formatYen(investors.reduce((acc, curr) => {
                      const totalAPagar = curr.qtdParcelas * curr.valorParcela;
                      return acc + (totalAPagar - curr.value);
                    }, 0))}
                  </span>
                </div>
                <div className="p-3 bg-accent-red/10 rounded-2xl border border-accent-red/20">
                  <TrendingDown className="h-6 w-6 text-accent-red" />
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Sua Sobra Líquida (Lucro Verde)</span>
                  <span className="text-2xl font-bold font-mono text-accent-green">
                    {formatYen(investors.reduce((acc, curr) => {
                      const totalAPagar = curr.qtdParcelas * curr.valorParcela;
                      const lucroVermelho = totalAPagar - curr.value;
                      const lucroVerde = (curr.value * 0.20) - lucroVermelho;
                      return acc + lucroVerde;
                    }, 0))}
                  </span>
                </div>
                <div className="p-3 bg-accent-green/10 rounded-2xl border border-accent-green/20">
                  <ArrowUpRight className="h-6 w-6 text-accent-green" />
                </div>
              </div>
            </div>

            {/* Layout Dividido Form + Tabela */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Novo Financiamento */}
              <div className="lg:col-span-4 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-accent-purple" />
                  <h3 className="text-lg font-bold text-white">Novo Financiamento</h3>
                </div>
                <form onSubmit={handleAddInvestor} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nome do Acionista</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Ichiro Suzuki"
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Valor Solicitado (¥)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 font-mono text-sm">¥</span>
                      <input 
                        type="number" 
                        placeholder="Ex: 1000000"
                        value={newInvValue}
                        onChange={(e) => setNewInvValue(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nº Parcelas</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 10"
                        value={newInvParcelas}
                        onChange={(e) => setNewInvParcelas(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Valor Parcela (¥)</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 110000"
                        value={newInvValorParcela}
                        onChange={(e) => setNewInvValorParcela(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-mono"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-400 uppercase">Data de Aporte</label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="checkbox" 
                          id="noDate"
                          checked={newInvNoDate}
                          onChange={(e) => setNewInvNoDate(e.target.checked)}
                          className="h-3.5 w-3.5 accent-accent-purple rounded bg-dark-bg border-dark-border cursor-pointer"
                        />
                        <label htmlFor="noDate" className="text-xs text-gray-400 font-medium cursor-pointer">Sem data fixada</label>
                      </div>
                    </div>
                    <input 
                      type="date"
                      disabled={newInvNoDate}
                      value={newInvDate}
                      onChange={(e) => setNewInvDate(e.target.value)}
                      className={`w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-purple/50 font-mono ${
                        newInvNoDate ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-purple/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Registrar Financiamento</span>
                  </button>
                </form>
              </div>

              {/* Tabela Detalhada */}
              <div className="lg:col-span-8 bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm overflow-x-auto">
                <h3 className="text-lg font-bold text-white mb-4">Investidores e Sobra Líquida</h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-3">Investidor</th>
                      <th className="py-4 px-3 text-right">Solicitado</th>
                      <th className="py-4 px-3 text-center">Parcelas</th>
                      <th className="py-4 px-3 text-right">Val. Parcela</th>
                      <th className="py-4 px-3 text-right">Total a Pagar</th>
                      <th className="py-4 px-3 text-right">Ainda Devo</th>
                      <th className="py-4 px-3 text-right">Juros (Pago)</th>
                      <th className="py-4 px-3 text-right">Sobra Verde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/40 text-sm">
                    {investors.map(inv => {
                      const totalAPagar = inv.qtdParcelas * inv.valorParcela;
                      const aindaDevo = totalAPagar - (inv.parcelasPagas * inv.valorParcela);
                      const lucroVermelho = totalAPagar - inv.value;
                      const lucroVerde = (inv.value * 0.20) - lucroVermelho;

                      return (
                        <tr key={inv.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="py-4 px-3 font-bold text-white">
                            <div>
                              <span>{inv.name}</span>
                              <span className="text-[10px] text-gray-500 block font-mono">{inv.date}</span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right font-mono">{formatYen(inv.value)}</td>
                          <td className="py-4 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-gray-300 font-mono">
                              {inv.parcelasPagas} / {inv.qtdParcelas}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono">{formatYen(inv.valorParcela)}</td>
                          <td className="py-4 px-3 text-right font-mono">{formatYen(totalAPagar)}</td>
                          <td className="py-4 px-3 text-right font-mono text-gray-300 font-semibold">{formatYen(aindaDevo)}</td>
                          <td className="py-4 px-3 text-right font-mono text-accent-red font-bold">{formatYen(lucroVermelho)}</td>
                          <td className="py-4 px-3 text-right font-mono text-accent-green font-extrabold">{formatYen(lucroVerde)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 4: DASHBOARD & HISTÓRICO --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Top 3 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* KPI 1 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Disponível em Caixa</span>
                  <span className="text-2xl font-bold font-mono text-accent-blue">{formatYen(cashBalance)}</span>
                </div>
                <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
                  <DollarSign className="h-6 w-6 text-accent-blue" />
                </div>
              </div>

              {/* KPI 2 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Capital Girando na Rua</span>
                  <span className="text-2xl font-bold font-mono text-accent-green">{formatYen(capitalOnStreet)}</span>
                </div>
                <div className="p-3 bg-accent-green/10 rounded-2xl border border-accent-green/20">
                  <TrendingUp className="h-6 w-6 text-accent-green" />
                </div>
              </div>

              {/* KPI 3 */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Soma de Juros a Receber</span>
                  <span className="text-2xl font-bold font-mono text-accent-purple">{formatYen(totalAccruedInterest)}</span>
                </div>
                <div className="p-3 bg-accent-purple/10 rounded-2xl border border-accent-purple/20">
                  <Percent className="h-6 w-6 text-accent-purple" />
                </div>
              </div>
            </div>

            {/* Form Movimentar Caixa */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-lg">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-accent-blue" />
                <h3 className="text-lg font-bold text-white">Movimentar Caixa Manual</h3>
              </div>
              <form onSubmit={handleMoveCash} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Operação</label>
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-medium"
                  >
                    <option value="aporte">Aporte (Entrada +)</option>
                    <option value="retirada">Retirada (Saída -)</option>
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Valor da Transação (¥)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2 text-gray-500 font-mono text-sm">¥</span>
                    <input 
                      type="number"
                      placeholder="Ex: 50000"
                      value={moveValue}
                      onChange={(e) => setMoveValue(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl pl-8 pr-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent-blue/50 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold py-2 px-6 rounded-xl text-sm transition-all shadow-md shadow-accent-blue/10 flex items-center justify-center gap-2 cursor-pointer h-[38px]"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Registrar</span>
                </button>
              </form>
            </div>

            {/* Área de Histórico Filtrável */}
            <div className="border border-dark-border rounded-2xl bg-dark-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border pb-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-bold text-white">Histórico e Lançamentos Periodizados</h3>
                </div>
                {/* Select de Tempo */}
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="atual">Mês Atual (Julho 2026)</option>
                  <option value="anterior">Mês Anterior (Junho 2026)</option>
                  <option value="todo">Todo o Período</option>
                </select>
              </div>

              {/* KPIs do Período */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-dark-bg/60 border border-dark-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Concedido no Período</span>
                    <span className="text-xl font-bold font-mono text-accent-purple">{formatYen(totalLentInPeriod)}</span>
                  </div>
                  <ArrowDownRight className="h-5 w-5 text-accent-purple opacity-70" />
                </div>
                <div className="bg-dark-bg/60 border border-dark-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Recebido no Período</span>
                    <span className="text-xl font-bold font-mono text-accent-green">{formatYen(totalReceivedInPeriod)}</span>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-accent-green opacity-70" />
                </div>
              </div>

              {/* Side-by-side Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Empréstimos Realizados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Empréstimos Realizados ({filteredLoans.length})</h4>
                  </div>
                  <div className="overflow-x-auto border border-dark-border rounded-xl bg-dark-bg/40 max-h-[300px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-dark-border text-gray-400 font-semibold bg-dark-bg/80">
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3 text-center">Data</th>
                          <th className="py-2.5 px-3 text-right">Capital (¥)</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/40 font-medium">
                        {filteredLoans.map(loan => (
                          <tr key={loan.id} className="hover:bg-gray-800/10">
                            <td className="py-2.5 px-3 text-white font-bold">{loan.client}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{loan.dateCreated}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatYen(loan.valueOriginal)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                loan.isActive 
                                  ? 'bg-accent-blue/10 text-accent-blue' 
                                  : 'bg-accent-green/10 text-accent-green'
                              }`}>
                                {loan.isActive ? 'Ativo' : 'Pago'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredLoans.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center py-6 text-gray-500 font-medium">Sem empréstimos no período.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagamentos Recebidos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Pagamentos Recebidos ({filteredPayments.length})</h4>
                  </div>
                  <div className="overflow-x-auto border border-dark-border rounded-xl bg-dark-bg/40 max-h-[300px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-dark-border text-gray-400 font-semibold bg-dark-bg/80">
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3 text-center">Data</th>
                          <th className="py-2.5 px-3 text-right">Valor Pago (¥)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border/40 font-medium">
                        {filteredPayments.map(pay => (
                          <tr key={pay.id} className="hover:bg-gray-800/10">
                            <td className="py-2.5 px-3 text-white font-bold">{pay.clientName}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{pay.date}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-accent-green font-bold">{formatYen(pay.value)}</td>
                          </tr>
                        ))}
                        {filteredPayments.length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center py-6 text-gray-500 font-medium">Sem pagamentos no período.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- EDIT LOAN MODAL --- */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setEditingLoan(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Editar Contrato</h3>
            <form onSubmit={handleEditLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Cliente</label>
                <input 
                  type="text" 
                  value={editingLoan.client}
                  onChange={(e) => setEditingLoan({ ...editingLoan, client: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Capital Original (¥)</label>
                <input 
                  type="number" 
                  value={editingLoan.valueOriginal}
                  onChange={(e) => setEditingLoan({ ...editingLoan, valueOriginal: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Saldo Atual (¥)</label>
                <input 
                  type="number" 
                  value={editingLoan.balance}
                  onChange={(e) => setEditingLoan({ ...editingLoan, balance: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-mono text-accent-green font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Juros a.m. (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={editingLoan.interest}
                    onChange={(e) => setEditingLoan({ ...editingLoan, interest: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Vencimento</label>
                  <input 
                    type="date"
                    value={editingLoan.dueDate}
                    onChange={(e) => setEditingLoan({ ...editingLoan, dueDate: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-accent-green/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingLoan(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all border border-dark-border cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-accent-green hover:bg-accent-green/90 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-accent-green/10 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function AuthScreen({ showToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoadingAuth(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        setSuccessMsg('Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar o cadastro.');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      let friendlyMessage = err.message;
      if (err.message === 'Invalid login credentials') {
        friendlyMessage = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (err.message === 'User already registered') {
        friendlyMessage = 'Este e-mail já está cadastrado no sistema.';
      } else if (err.message === 'Signup requires a valid email') {
        friendlyMessage = 'Por favor, insira um endereço de e-mail válido.';
      } else if (err.message === 'Password should be at least 6 characters') {
        friendlyMessage = 'A senha deve conter pelo menos 6 caracteres.';
      }
      setErrorMsg(friendlyMessage);
      showToast(friendlyMessage, 'error');
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#151D30] rounded-2xl border border-gray-800 p-8 shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3 bg-accent-blue/10 rounded-2xl border border-accent-blue/20">
            <TrendingUp className="h-8 w-8 text-accent-blue" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight text-center">
            {isLogin ? 'Bem-vindo ao CrediDash' : 'Criar Nova Conta'}
          </h2>
          <p className="text-xs text-gray-400 text-center">
            {isLogin 
              ? 'Insira suas credenciais para gerenciar seus empréstimos' 
              : 'Registre-se para começar a gerenciar suas finanças de forma isolada'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-sm flex items-start gap-2.5">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Endereço de E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={loadingAuth}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-accent-blue/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loadingAuth ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : isLogin ? (
              'Entrar no Sistema'
            ) : (
              'Criar Minha Conta'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-xs text-accent-blue hover:underline font-medium cursor-pointer bg-transparent border-none"
          >
            {isLogin 
              ? 'Não tem uma conta? Cadastre-se' 
              : 'Já tem uma conta? Faça Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
