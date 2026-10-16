export type FineSeverity = 'LEVE' | 'MEDIA' | 'GRAVE' | 'GRAVISSIMA';

export type FineStatus = 'PENDENTE' | 'VENCIDA' | 'PAGA' | 'EM_RECURSO';

export type CnhCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

export type DriverStatus = 'REGULAR' | 'ALERTA' | 'SUSPENSA' | 'CASSADA';

export type UserRole =
  | 'ADMIN'
  | 'GESTOR_FROTA'
  | 'GESTOR_RH'
  | 'GESTOR_LOGISTICA'
  | 'OPERADOR'
  | 'AUDITOR'
  | 'MOTORISTA';

export interface UserPermissions {
  viewDashboard: boolean;
  manageDrivers: boolean;
  manageVehicles: boolean;
  manageFines: boolean;
  searchFines: boolean;
  generateReports: boolean;
  manageTerms: boolean;
  applyDoubledFine: boolean;
  accessOperacaoCA?: boolean; // Permissão dedicada para acessar a Operação C.A
  manageCompanies?: boolean; // Permissão para gerenciar cadastro de empresas
  manageUsers: boolean;
  resetDatabase: boolean;
}

export interface Company {
  id: string;
  name: string; // Razão Social Oficial
  tradeName?: string; // Nome Fantasia
  cnpj: string;
  badge?: string;
  stateRegistration?: string; // Inscrição Estadual
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  active: boolean;
  isPlogCompany?: boolean;
  defaultUsername?: string;
  createdAt: string;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  email: string;
  cpf?: string;
  password: string;
  role: UserRole;
  customRoleName?: string;
  department: string;
  companyId?: string;
  companyName?: string;
  companyCnpj?: string;
  active: boolean;
  permissions: UserPermissions;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  id?: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  customRoleName?: string;
  department?: string;
  permissions?: UserPermissions;
  companyId?: string;
  companyName: string;
  companyCnpj: string;
  avatarUrl?: string;
  loginAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: CnhCategory;
  cnhExpiration: string; // YYYY-MM-DD
  birthDate?: string;
  fatherName?: string; // Filiação - Nome do Pai
  motherName?: string; // Filiação - Nome da Mãe
  cnhSecurityCode?: string; // Código de Segurança da CNH
  renachNumber?: string; // Número do RENACH
  cnhIssueDate?: string; // Data de Emissão da CNH (YYYY-MM-DD)
  firstLicenseDate?: string; // Primeira Habilitação (YYYY-MM-DD)
  currentPoints: number;
  status: DriverStatus;
  phone: string;
  email: string;
  rg?: string; // Documento de Identidade / RG
  observations?: string; // Observações / Anotações do Motorista
  assignedVehiclePlate?: string;
  companyName?: string;
  companyCnpj?: string;
  isPlogDriver?: boolean; // Diferencial: Motorista P-LOG vs Frota Geral
  operationType?: 'PLOG' | 'FROTA_GERAL';
  createdAt: string;
}

export type VehicleType =
  | 'Toco'
  | 'Truck'
  | 'Bitruck'
  | '3/4'
  | 'Van'
  | 'Utilitário'
  | 'Cavalo Mecânico'
  | 'Caminhão'
  | 'Carreta'
  | 'Automóvel'
  | 'Ônibus';

export interface Vehicle {
  id: string;
  plate: string;
  renavam: string;
  chassis: string;
  brandModel: string;
  yearFabMod: string; // "2023/2024"
  vehicleType: VehicleType;
  fuel: string;
  color: string;
  ownerName: string;
  ownerCnpjCpf: string;
  cityUf: string;
  assignedDriverId?: string;
  companyName?: string;
  companyCnpj?: string;
  isPlogVehicle?: boolean;
  licensingStatus: 'EM_DIA' | 'PENDENTE' | 'VENCIDO';
  activeFinesCount: number;
  totalFinesValue: number;
  createdAt: string;
}

export interface TrafficFine {
  id: string;
  aitNumber: string; // "Indentificação do Auto de Infração (AIT)"
  plate: string;
  infractionDate: string; // YYYY-MM-DDTHH:mm
  infractionLocation: string;
  city: string;
  state: string;
  infractionCode: string; // ex: "7455-0"
  infractionDescription: string;
  fineAmount: number; // Valor integral em R$ (ou valor final após multiplicação)
  discountAmount?: number; // 20% ou 40% com SNE
  originalAmount?: number; // Valor base antes de dobrar/multiplicar
  isDoubledFine?: boolean; // Opção de Multa Dobrada (2x) / NIC PJ
  multiplierFactor?: number; // Fator multiplicador (1x, 2x, 3x, 5x, 10x)
  isNicFine?: boolean; // Multa por Não Indicação de Condutor (Art. 257 § 8º CTB)
  ownerCnpjRazaoSocial: string; // "14.285.932/0001-44 - TransBrasil Logística & Cargas Ltda"
  driverId?: string;
  driverName?: string;
  dueDate: string; // YYYY-MM-DD
  status: FineStatus;
  severity: FineSeverity;
  points: number;
  issuingAuthority: 'DETRAN' | 'PRF' | 'DNIT' | 'DER' | 'PREFEITURA / CET' | 'DSV';
  pdfFileName?: string;
  pdfDataUrl?: string;
  pdfMimeType?: string;
  importedAt?: string;
  isDetranSynced?: boolean;
  notes?: string;
  termSigned?: boolean;
  termSignedAt?: string;
  payrollInstallments?: number;
  payrollDeductedAmount?: number;
  createdAt: string;
}

export interface DriverReceiptTerm {
  id: string;
  protocolNumber: string;
  fineId?: string;
  aitNumber: string;
  plate: string;
  vehicleModel: string;
  driverId?: string;
  driverName: string;
  driverCpf: string;
  driverCnh: string;
  infractionDate: string;
  infractionLocation: string;
  cityState: string;
  infractionCode: string;
  infractionDescription: string;
  points: number;
  originalPoints?: number;
  issuingAuthority: string;
  originalFineAmount: number;
  finalDeductedAmount: number;
  isDoubledFine?: boolean;
  useSneDiscount: boolean;
  installments: number;
  installmentValue: number;
  payrollMonth: string; // ex: "2026-10"
  companyName: string;
  companyCnpj: string;
  status: 'PENDENTE_ASSINATURA' | 'ASSINADO';
  signedAt?: string;
  signatureHash?: string;
  observations?: string;
  createdAt: string;
}

export interface DetranQueryResult {
  plate: string;
  renavam: string;
  chassis: string;
  vehicleModel: string;
  ownerName: string;
  licensingStatus: 'EM_DIA' | 'PENDENTE' | 'BLOQUEIO_ADMINISTRATIVO';
  totalFinesAmount: number;
  ipvaDebts: number;
  fines: TrafficFine[];
  lastConsultationDate: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'FINE_OVERDUE' | 'FINE_NEW' | 'DRIVER_POINTS_ALERT' | 'DETRAN_SYNC' | 'CRLV_EXPIRING' | 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  severity?: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  relatedPlate?: string;
  relatedAit?: string;
  relatedDriverId?: string;
  aitNumber?: string;
  plate?: string;
}

export type NotificationItem = AppNotification;

export interface OperacaoCAItem {
  id: string;
  ait: string; // Auto de Infração de Trânsito (Chave de checagem de duplicidade)
  plate: string; // Placa do Veículo
  driverName?: string; // Nome do Motorista Vinculado à Placa
  driverCnh?: string; // CNH do Motorista
  driverId?: string; // ID do Motorista cadastrado
  infractionDescription: string; // Descrição da Infração
  originalValue: number; // Valor Original / Cobrado (R$)
  emailNoticeDate?: string; // Data do Envio (Email / Notificação)
  nominationDeadline?: string; // Data Limite para Indicação
  nominatedName?: string; // Nome do Indicado (ex: P-LOG TRANSPORTES)
  discountPaymentDeadline?: string; // Data Limite Pagamento com Desconto
  notificationStatus?: string; // Status da Notificação / Prazo Expirado
  infractionLocation?: string; // Local da Infração
  adminFee: number; // Taxa Administrativa (R$)
  driverStatusCompetence?: string; // Status Motorista / Competência (ex: Indisponível Motorista Março)
  year: number; // Ano (ex: 2026)
  payrollDeduction: string; // Desconto em Folha (ex: Sim-F.Log, Sim, Não)
  appealStatus: string; // Recurso (Não, Sim)
  totalValue: number; // Valor Total (Valor Original + Taxa Administrativa)
  // Campos de Pagamento da Multa
  paymentStatus?: 'PENDENTE' | 'PAGO'; // Status de pagamento
  paidAt?: string; // Data em que foi paga
  paidBy?: string; // Por quem foi pago (Nome de quem pagou)
  invoiceNumber?: string; // Número da Nota Fiscal (NF)
  paymentNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperacaoCATerm {
  id: string;
  protocolNumber: string;
  caItemId: string;
  ait: string;
  plate: string;
  driverName: string;
  driverCnh?: string;
  driverCpf?: string;
  notificationDate?: string;
  infractionDate: string;
  infractionLocation: string;
  infractionDescription: string;
  fineAmount: number;
  adminFee: number;
  totalAmount: number;
  payrollDeduction?: string;
  generatedAt: string;
  signedAt?: string;
  status: 'EMITIDO' | 'ASSINADO';
  signatureDataUrl?: string;
  companyName?: string;
}

