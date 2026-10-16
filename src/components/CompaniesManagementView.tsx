import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  X,
  Users,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { Company, SystemUser } from '../types';
import { formatCNPJ } from '../lib/formatters';

interface CompaniesManagementViewProps {
  companies: Company[];
  onSaveCompany: (company: Company, isNew: boolean) => void;
  onDeleteCompany: (companyId: string) => void;
  users?: SystemUser[];
}

export const CompaniesManagementView: React.FC<CompaniesManagementViewProps> = ({
  companies,
  onSaveCompany,
  onDeleteCompany,
  users = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [badge, setBadge] = useState('🏢 FILIAL');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
        c.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [companies, searchTerm]);

  const handleOpenNewModal = () => {
    setEditingCompany(null);
    setName('');
    setTradeName('');
    setCnpj('');
    setStateRegistration('');
    setCity('');
    setState('SP');
    setAddress('');
    setPhone('');
    setEmail('');
    setBadge('🏢 FILIAL');
    setDescription('');
    setActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setTradeName(comp.tradeName || '');
    setCnpj(comp.cnpj);
    setStateRegistration(comp.stateRegistration || '');
    setCity(comp.city || '');
    setState(comp.state || 'SP');
    setAddress(comp.address || '');
    setPhone(comp.phone || '');
    setEmail(comp.email || '');
    setBadge(comp.badge || '🏢 FILIAL');
    setDescription(comp.description || '');
    setActive(comp.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCnpjChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) {
      setCnpj(digits);
    } else if (digits.length <= 5) {
      setCnpj(`${digits.slice(0, 2)}.${digits.slice(2)}`);
    } else if (digits.length <= 8) {
      setCnpj(`${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`);
    } else if (digits.length <= 12) {
      setCnpj(
        `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
      );
    } else {
      setCnpj(
        `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(
          8,
          12
        )}-${digits.slice(12)}`
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanCnpj = cnpj.trim();

    if (!cleanName) {
      setFormError('Informe a Razão Social da empresa.');
      return;
    }

    if (cleanCnpj.replace(/\D/g, '').length < 14) {
      setFormError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }

    // Check CNPJ duplicate
    const exists = companies.find(
      (c) =>
        c.cnpj.replace(/\D/g, '') === cleanCnpj.replace(/\D/g, '') &&
        (!editingCompany || editingCompany.id !== c.id)
    );
    if (exists) {
      setFormError(`Já existe uma empresa cadastrada com este CNPJ (${exists.name}).`);
      return;
    }

    const companyData: Company = {
      id: editingCompany ? editingCompany.id : `comp-${Date.now().toString().slice(-6)}`,
      name: cleanName,
      tradeName: tradeName.trim() || cleanName,
      cnpj: cleanCnpj,
      stateRegistration: stateRegistration.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      badge: badge.trim() || '🏢 FILIAL',
      description: description.trim() || undefined,
      active,
      isPlogCompany:
        cleanName.toLowerCase().includes('plog') ||
        tradeName.toLowerCase().includes('plog') ||
        (editingCompany?.isPlogCompany ?? false),
      createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString().slice(0, 10),
    };

    onSaveCompany(companyData, !editingCompany);
    setIsModalOpen(false);
  };

  const getUserCountForCompany = (company: Company) => {
    return users.filter((u) => {
      const matchId = u.companyId && u.companyId === company.id;
      const matchName =
        u.companyName && u.companyName.trim().toLowerCase() === company.name.trim().toLowerCase();
      const matchCnpj =
        u.companyCnpj &&
        u.companyCnpj.replace(/\D/g, '') === company.cnpj.replace(/\D/g, '');
      return matchId || matchName || matchCnpj;
    }).length;
  };

  return (
    <div id="companies-management-view" className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Módulo ERP • Multiempresas & Filiais</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cadastro & Gestão de Empresas / Filiais (ERP)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Cadastre novas empresas e filiais da organização. As empresas cadastradas aqui aparecem
            automaticamente na tela inicial para seleção antes do login e vinculação de usuários.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewModal}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Empresa</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block uppercase">
              Total de Empresas Cadastradas
            </span>
            <span className="text-xl font-black font-mono text-slate-900">
              {companies.length} empresa(s)
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block uppercase">
              Empresas Ativas no ERP
            </span>
            <span className="text-xl font-black font-mono text-emerald-700">
              {companies.filter((c) => c.active).length} ativas
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block uppercase">
              Usuários Vinculados às Empresas
            </span>
            <span className="text-xl font-black font-mono text-purple-700">
              {users.length} usuários
            </span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            🔒 Regra de Segurança Multiempresa (Conforme Solicitado):
          </p>
          <p className="text-amber-800 leading-relaxed">
            O cadastro de novas empresas e filiais <strong>NÃO pode ser feito na tela inicial</strong>{' '}
            e sim com o Administrador logado no sistema. Ao criar uma empresa nesta tela, ela se
            torna imediatamente disponível na tela inicial (em linha, ERP) para que usuários
            possam selecioná-la e efetuar login com seus acessos vinculados.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ ou Cidade..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
        <div className="text-xs font-bold text-slate-600">
          Listando <span className="text-blue-700 font-mono">{filteredCompanies.length}</span> de{' '}
          <span className="font-mono">{companies.length}</span> empresas
        </div>
      </div>

      {/* ERP Table: Em Linha */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4">Empresa (Razão Social & Fantasia)</th>
                <th className="py-3.5 px-4">CNPJ & Inscrição Estadual</th>
                <th className="py-3.5 px-4">Cidade / UF & Endereço</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4 text-center">Usuários</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Nenhuma empresa encontrada</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Tente outro termo de pesquisa ou clique em &quot;Cadastrar Nova Empresa&quot;.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp, idx) => {
                  const userCount = getUserCountForCompany(comp);
                  const isProtected = ['comp-matriz', 'comp-plog'].includes(comp.id);
                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-blue-50/20 transition-colors group cursor-pointer"
                      onClick={() => handleOpenEditModal(comp)}
                    >
                      <td className="py-3 px-4 text-center text-slate-500 font-mono font-bold">
                        {idx + 1}
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                            {comp.badge || '🏢 EMPRESA'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors block">
                              {comp.name}
                            </span>
                            {comp.tradeName && comp.tradeName !== comp.name && (
                              <span className="text-[11px] text-slate-500 block">
                                Fantasia: {comp.tradeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CNPJ */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 block">
                          {formatCNPJ(comp.cnpj)}
                        </span>
                        {comp.stateRegistration && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            IE: {comp.stateRegistration}
                          </span>
                        )}
                      </td>

                      {/* Cidade / UF */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {comp.city || 'São Paulo'}/{comp.state || 'SP'}
                          </span>
                        </div>
                        {comp.address && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                            {comp.address}
                          </span>
                        )}
                      </td>

                      {/* Contato */}
                      <td className="py-3 px-4 text-slate-600">
                        {comp.phone && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{comp.phone}</span>
                          </div>
                        )}
                        {comp.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[160px]">{comp.email}</span>
                          </div>
                        )}
                        {!comp.phone && !comp.email && <span className="text-slate-400">—</span>}
                      </td>

                      {/* Usuários Vinculados */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{userCount}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {comp.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ativa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>Inativa</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(comp)}
                            title="Editar Dados da Empresa"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!isProtected && (
                            <>
                              {deleteConfirmId === comp.id ? (
                                <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteCompany(comp.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(comp.id)}
                                  title="Excluir Empresa"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Empresa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl text-slate-900 my-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCompany ? 'Editar Empresa / Filial ERP' : 'Cadastrar Nova Empresa / Filial'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Preencha os dados cadastrais da empresa para liberação no login e vínculos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Razão Social */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Razão Social (Nome Oficial) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: TransBrasil Cargas e Logística Ltda"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                    required
                  />
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="ex: TransBrasil Express"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {/* Inscrição Estadual */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                    placeholder="ex: 110.293.847.119"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Badge Identificador */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Badge de Exibição no Login
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="ex: 🏢 FILIAL, 🚛 LOGÍSTICA"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ex: São Paulo"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* UF */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Estado (UF)
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'ES', 'GO', 'BA', 'DF'].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Endereço */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Endereço Completo / Logradouro
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Rod. Anhanguera, KM 28 - Galpão 04"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Telefone Corporativo
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 4000-0000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Descrição / Finalidade Operacional
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Breve descrição da operação desta unidade para exibição no login..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Status Ativa Checkbox */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Empresa Ativa no ERP (Aparece na tela de seleção inicial)
                  </span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
