import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileSignature,
  Printer,
  CheckCircle2,
  Eraser,
  Calendar,
  MapPin,
  Truck,
  User,
  CreditCard,
  FileText,
  Building,
  Save,
  Clock,
} from 'lucide-react';
import { OperacaoCAItem, OperacaoCATerm, Driver, Vehicle } from '../types';
import { maskDate, maskDateTime, formatCPF } from '../lib/formatters';

interface OperacaoCATermModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: OperacaoCAItem | null;
  itemsForDriver?: OperacaoCAItem[];
  driverName?: string;
  registeredDrivers?: Driver[];
  vehicles?: Vehicle[];
  onSaveTerm: (term: OperacaoCATerm) => void;
  existingTerm?: OperacaoCATerm | null;
}

export const OperacaoCATermModal: React.FC<OperacaoCATermModalProps> = ({
  isOpen,
  onClose,
  item,
  itemsForDriver = [],
  driverName = '',
  registeredDrivers = [],
  vehicles = [],
  onSaveTerm,
  existingTerm,
}) => {
  // If a single item is provided, use it, otherwise use the list of items for the driver
  const finesList = item ? [item] : itemsForDriver;
  const primaryFine = finesList[0];

  const matchedDriver = registeredDrivers.find(
    (d) =>
      d.name.toLowerCase() === (driverName || primaryFine?.driverName || '').toLowerCase()
  );

  const [selectedDriverId, setSelectedDriverId] = useState<string>(matchedDriver?.id || '');
  const [termDriverName, setTermDriverName] = useState(
    existingTerm?.driverName || driverName || primaryFine?.driverName || 'NÃO INFORMADO'
  );
  const [termDriverCnh, setTermDriverCnh] = useState(
    existingTerm?.driverCnh || matchedDriver?.cnhNumber || primaryFine?.driverCnh || ''
  );
  const [termDriverCpf, setTermDriverCpf] = useState(
    existingTerm?.driverCpf || matchedDriver?.cpf || ''
  );
  const [termPlate, setTermPlate] = useState(
    existingTerm?.plate || primaryFine?.plate || matchedDriver?.assignedVehiclePlate || ''
  );
  const [notificationDate, setNotificationDate] = useState(() => {
    if (existingTerm?.notificationDate) return maskDateTime(existingTerm.notificationDate);
    if (primaryFine?.emailNoticeDate) return maskDateTime(primaryFine.emailNoticeDate);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
  });
  const [termDate, setTermDate] = useState(() => {
    if (existingTerm?.infractionDate) return maskDate(existingTerm.infractionDate);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  });
  const [companyName, setCompanyName] = useState(
    existingTerm?.companyName || 'P-LOG TRANSPORTES & LOGÍSTICA'
  );

  // Driver selection: autofills driver data and vinculates assigned vehicle plate
  const handleDriverSelect = (driverId: string) => {
    setSelectedDriverId(driverId);
    const found = registeredDrivers.find((d) => d.id === driverId);
    if (found) {
      setTermDriverName(found.name);
      setTermDriverCnh(found.cnhNumber);
      setTermDriverCpf(found.cpf);
      if (found.assignedVehiclePlate) {
        setTermPlate(found.assignedVehiclePlate);
      }
    }
  };

  // Vehicle selection: vinculates plate and matching driver if assigned
  const handleVehicleSelect = (plateVal: string) => {
    setTermPlate(plateVal.toUpperCase());
    const matchedVeh = vehicles.find(
      (v) => v.plate.toUpperCase() === plateVal.toUpperCase()
    );
    if (matchedVeh?.assignedDriverId) {
      handleDriverSelect(matchedVeh.assignedDriverId);
    }
  };

  // Digital Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(existingTerm?.signatureDataUrl));

  useEffect(() => {
    if (existingTerm?.signatureDataUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = existingTerm.signatureDataUrl;
      }
    }
  }, [existingTerm]);

  if (!isOpen || finesList.length === 0) return null;

  const totalAmount = finesList.reduce((acc, f) => acc + (f.totalValue || 0), 0);
  const protocolNumber =
    existingTerm?.protocolNumber ||
    `CA-REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    const signatureDataUrl = canvasRef.current ? canvasRef.current.toDataURL() : undefined;

    const newTerm: OperacaoCATerm = {
      id: existingTerm?.id || `ca-term-${Date.now().toString(36)}`,
      protocolNumber,
      caItemId: primaryFine.id,
      ait: finesList.map((f) => f.ait).join(', '),
      plate: termPlate || Array.from(new Set(finesList.map((f) => f.plate))).join(', '),
      driverName: termDriverName || 'NÃO INFORMADO',
      driverCnh: termDriverCnh,
      driverCpf: termDriverCpf,
      notificationDate: notificationDate,
      infractionDate: termDate,
      infractionLocation: primaryFine.infractionLocation || 'Local não informado',
      infractionDescription: primaryFine.infractionDescription,
      fineAmount: primaryFine.originalValue,
      adminFee: primaryFine.adminFee,
      totalAmount: totalAmount,
      payrollDeduction: primaryFine.payrollDeduction || 'Sim-F.Log',
      generatedAt: existingTerm?.generatedAt || new Date().toISOString(),
      signedAt: hasSignature ? new Date().toISOString() : undefined,
      status: hasSignature ? 'ASSINADO' : 'EMITIDO',
      signatureDataUrl: hasSignature ? signatureDataUrl : undefined,
      companyName,
    };

    onSaveTerm(newTerm);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Actions Header (No Print) */}
        <div className="no-print p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Termo de Ciência e Recibo de Infração — Operação C.A
              </h3>
              <p className="text-xs text-slate-500">
                Protocolo: <strong className="font-mono text-blue-600">{protocolNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Visualizar e Imprimir Termo em papel A4"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Imprimir Termo (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar e Armazenar Termo</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 printable-receipt-document bg-white">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase block">
                {companyName}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Termo de Ciência e Recibo de Infração de Trânsito
              </h1>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                Operação C.A — Controle Interno de Frotas & Logística P-LOG
              </span>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Número do Protocolo</span>
              <span className="text-sm font-black font-mono text-slate-900">{protocolNumber}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Emitido em: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Quick Select: Motorista Já Cadastrado & Vincular à Placa (No-Print) */}
          <div className="no-print p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-700" />
                <span>Selecionar Motorista Já Cadastrado & Vincular à Placa</span>
              </span>
              <span className="text-[11px] text-blue-700">
                Preenchimento automático e vinculação imediata
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Motoristas Cadastrados no Sistema
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  <option value="">-- Selecionar Motorista Cadastrado --</option>
                  {registeredDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} • CPF: {d.cpf} • CNH: {d.cnhNumber}
                      {d.isPlogDriver || d.operationType === 'PLOG' ? ' [P-LOG]' : ''}
                      {d.assignedVehiclePlate ? ` (Placa: ${d.assignedVehiclePlate})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vincular Veículo da Frota (Placa)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={termPlate}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs font-mono font-bold"
                  >
                    <option value="">-- Selecionar Placa Cadastrada --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plate}>
                        {v.plate} — {v.brandModel || 'Veículo'}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={termPlate}
                    onChange={(e) => setTermPlate(e.target.value.toUpperCase())}
                    placeholder="Ou digite"
                    className="w-28 px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Identification & Date Masks */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="md:col-span-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Condutor / Motorista Responsável
              </span>
              <input
                type="text"
                value={termDriverName}
                onChange={(e) => setTermDriverName(e.target.value)}
                className="w-full font-black text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500 uppercase"
                placeholder="Nome Completo do Motorista"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                CPF do Motorista
              </span>
              <input
                type="text"
                value={termDriverCpf}
                onChange={(e) => setTermDriverCpf(formatCPF(e.target.value))}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Registro CNH
              </span>
              <input
                type="text"
                value={termDriverCnh}
                onChange={(e) => setTermDriverCnh(e.target.value)}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500"
                placeholder="Nº da CNH"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-600" />
                <span>Placa Vinculada</span>
              </span>
              <input
                type="text"
                value={termPlate}
                onChange={(e) => setTermPlate(e.target.value.toUpperCase())}
                className="w-full font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500 uppercase"
                placeholder="ABC1D23"
              />
            </div>

            {/* Máscara da Data de Notificação: DD/MM/AAAA HH:MM */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                <span>Data Notificação (DD/MM/AAAA HH:MM)</span>
              </span>
              <input
                type="text"
                value={notificationDate}
                onChange={(e) => setNotificationDate(maskDateTime(e.target.value))}
                maxLength={16}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500"
                placeholder="DD/MM/AAAA HH:MM"
              />
            </div>

            {/* Máscara da Data de Infração: DD/MM/AAAA */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Data Infração (DD/MM/AAAA)</span>
              </span>
              <input
                type="text"
                value={termDate}
                onChange={(e) => setTermDate(maskDate(e.target.value))}
                maxLength={10}
                className="w-full font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Empresa / Cabeçalho
              </span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 mt-1 text-xs focus:outline-none focus:border-blue-500"
                placeholder="Razão Social"
              />
            </div>
          </div>

          {/* Section 2: Fines Discrimination Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Discriminação das Infrações Registradas na Operação C.A</span>
            </h4>

            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-600">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Placa</th>
                    <th className="py-2.5 px-3">AIT (Auto)</th>
                    <th className="py-2.5 px-3">Local da Infração</th>
                    <th className="py-2.5 px-3">Infração</th>
                    <th className="py-2.5 px-3 text-right">Valor Original</th>
                    <th className="py-2.5 px-3 text-right">Taxa Adm</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {finesList.map((f, idx) => (
                    <tr key={`fine-rec-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">{f.emailNoticeDate || termDate}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-black text-slate-900">{f.plate}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-blue-700">{f.ait}</td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate" title={f.infractionLocation}>
                        {f.infractionLocation || 'Não especificado'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px] truncate" title={f.infractionDescription}>
                        {f.infractionDescription}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {f.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600">
                        {f.adminFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-black text-slate-900">
                        {f.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-xs">
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase text-[11px] font-black text-slate-700">
                      Valor Total Consolidado do Recibo:
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-blue-700 text-sm">
                      {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Legal Terms & Responsibility Statement */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs leading-relaxed text-slate-700">
            <h5 className="font-black text-slate-900 uppercase text-[11px] tracking-wide">
              Declaração de Ciência e Autorização
            </h5>
            <p>
              Declaro expressamente para todos os efeitos de direito que tomei plena ciência do(s) Auto(s) de Infração
              de Trânsito (AIT) acima relacionado(s), cometidos durante a condução do veículo na{' '}
              <strong>Operação C.A</strong>, nos locais e datas devidamente discriminados.
            </p>
            <p>
              Reconheço a responsabilidade administrativa pelo ato e autorizo a empresa transportadora a processar o
              respectivo valor discriminado via desconto em folha de pagamento / faturamento de serviços, conforme
              legislação de trânsito vigente (Código de Trânsito Brasileiro - CTB) e políticas internas de gestão de frota.
            </p>
          </div>

          {/* Section 4: Signature Area */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Digital Signature Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                  <span>Assinatura Digital do Motorista (Tela / Mouse / Caneta)</span>
                </span>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="no-print text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-1 bg-slate-50 relative">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 bg-white rounded-lg cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                    Assine aqui com o dedo ou mouse
                  </div>
                )}
              </div>
            </div>

            {/* Formal Physical Signature Line */}
            <div className="space-y-4 text-center pb-2">
              <div className="border-b-2 border-slate-900 w-full pt-8"></div>
              <div>
                <p className="font-black text-xs text-slate-900 uppercase">{termDriverName}</p>
                <p className="text-[11px] text-slate-500">
                  {termDriverCnh ? `CNH: ${termDriverCnh}` : 'Motorista / Condutor'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Data: ____/____/________</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (No Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            {hasSignature ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Assinatura coletada com sucesso.
              </span>
            ) : (
              'Você pode assinar digitalmente ou imprimir para colher assinatura física.'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Termo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
