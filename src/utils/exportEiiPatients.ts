import { EiiDemoPatient } from '../data/eiiDemoPatients';

const COLUMNS: { label: string; value: (patient: EiiDemoPatient) => string | number }[] = [
  { label: 'Registro de demostración', value: (p) => p.id.replace('EII-DEMO-', 'Demo ') },
  { label: 'Diagnóstico', value: (p) => p.diagnosis },
  { label: 'Edad al corte 2026-10-16', value: (p) => p.age },
  { label: 'Sexo', value: (p) => p.sex },
  { label: 'EPS', value: (p) => p.eps },
  { label: 'Tratamiento actual', value: (p) => p.currentTreatment },
  { label: 'Uso de terapia biológica', value: (p) => p.usesBiologicTherapy },
  { label: 'Respuesta clínica reportada', value: (p) => p.clinicalResponse },
  { label: 'Remisión clínica reportada', value: (p) => p.clinicalRemission },
  { label: 'Respuesta bioquímica reportada', value: (p) => p.biochemicalResponse },
  { label: 'Respuesta endoscópica reportada', value: (p) => p.endoscopicResponse },
  { label: 'Próximo seguimiento', value: (p) => p.nextFollowUpDate },
  { label: 'Hemoglobina simulada (g/dL)', value: (p) => p.hemoglobin },
  { label: 'Calprotectina simulada (µg/g)', value: (p) => p.calprotectin },
  { label: 'PCR simulada (mg/L)', value: (p) => p.crp },
  { label: 'Manifestaciones extraintestinales', value: (p) => p.extraintestinalManifestations },
  { label: 'Consentimiento CE simulado', value: (p) => p.consentCenter },
];

function quoteCsvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function exportEiiPatientsToCsv(pacientes: EiiDemoPatient[], centroNombre: string) {
  const header = COLUMNS.map((column) => quoteCsvCell(column.label)).join(';');
  const rows = pacientes.map((patient) => COLUMNS.map((column) => quoteCsvCell(column.value(patient))).join(';'));
  const content = `\uFEFF${[header, ...rows].join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = centroNombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  link.href = url;
  link.download = `cerebro_fcv_${slug}_demo_2026-10-16.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
