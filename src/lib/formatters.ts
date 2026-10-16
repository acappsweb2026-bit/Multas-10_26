export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return '-';
  try {
    const parts = dateTimeString.split('T');
    const date = formatDate(parts[0]);
    const time = parts[1] ? parts[1].substring(0, 5) : '';
    return time ? `${date} às ${time}` : date;
  } catch {
    return dateTimeString;
  }
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPlate(plate: string): string {
  const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return plate.toUpperCase();
}

export function getDaysOverdue(dueDateString: string): number {
  if (!dueDateString) return 0;
  const due = new Date(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Máscara para Data e Hora no formato DD/MM/AAAA HH:MM
 * Ex: 200320261906 -> 20/03/2026 19:06
 */
export function maskDateTime(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 12);
  let res = '';
  if (digits.length > 0) res += digits.slice(0, 2);
  if (digits.length >= 3) res += '/' + digits.slice(2, 4);
  if (digits.length >= 5) res += '/' + digits.slice(4, 8);
  if (digits.length >= 9) res += ' ' + digits.slice(8, 10);
  if (digits.length >= 11) res += ':' + digits.slice(10, 12);
  return res;
}

/**
 * Máscara para Data no formato DD/MM/AAAA
 * Ex: 19042026 -> 19/04/2026
 */
export function maskDate(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  let res = '';
  if (digits.length > 0) res += digits.slice(0, 2);
  if (digits.length >= 3) res += '/' + digits.slice(2, 4);
  if (digits.length >= 5) res += '/' + digits.slice(4, 8);
  return res;
}

