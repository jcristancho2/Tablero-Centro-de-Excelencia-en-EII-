import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, MessageCircle, UsersRound } from 'lucide-react';
import colonIcon from '../assets/colon-icon.png';
import { CentroExcelencia } from '../types/clinical';
import { EiiDemoPatient, EII_REFERENCE_DATE } from '../data/eiiDemoPatients';
import { EiiPatientDetailModal } from './EiiPatientDetailModal';

interface EiiCenterDashboardProps {
  centro: CentroExcelencia;
  pacientes: EiiDemoPatient[];
}

interface DistributionItem {
  label: string;
  value: number;
  color: string;
}

type ChartFilterKind = 'diagnosis' | 'sex' | 'age' | 'treatment' | 'advancedTherapy' | 'clinicalResponse' | 'endoscopicResponse';
interface ChartFilter { kind: ChartFilterKind; value: string }
type ChartFilters = Partial<Record<ChartFilterKind, string>>;

const CHART_FILTER_LABELS: Record<ChartFilterKind, string> = {
  diagnosis: 'Diagnóstico',
  sex: 'Sexo',
  age: 'Grupo etario',
  treatment: 'Tipo de tratamiento',
  advancedTherapy: 'Terapia avanzada',
  clinicalResponse: 'Respuesta clínica',
  endoscopicResponse: 'Respuesta endoscópica',
};

const AGE_GROUPS = [
  { label: '18–35 años', min: 18, max: 35 },
  { label: '36–50 años', min: 36, max: 50 },
  { label: '51–65 años', min: 51, max: 65 },
  { label: 'Más de 65 años', min: 66, max: Infinity },
];

const TABLE_COLUMNS = [
  { key: 'id', label: 'Código de ficha' },
  { key: 'diagnosis', label: 'Diagnóstico' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'age', label: 'Edad' },
  { key: 'sex', label: 'Sexo' },
  { key: 'eps', label: 'EPS' },
  { key: 'currentTreatment', label: 'Tratamiento actual' },
  { key: 'usesBiologicTherapy', label: 'Terapia biológica' },
  { key: 'clinicalResponse', label: 'Respuesta clínica' },
  { key: 'clinicalRemission', label: 'Remisión clínica' },
  { key: 'biochemicalResponse', label: 'Respuesta bioquímica' },
  { key: 'biochemicalRemission', label: 'Remisión bioquímica' },
  { key: 'endoscopicResponse', label: 'Respuesta endoscópica' },
  { key: 'endoscopicRemission', label: 'Remisión endoscópica' },
  { key: 'histologicalRemission', label: 'Remisión histológica' },
  { key: 'surgeries', label: 'Cirugías reportadas' },
  { key: 'extraintestinalManifestations', label: 'Manifestaciones extraintestinales' },
  { key: 'hemoglobin', label: 'Hemoglobina' },
  { key: 'calprotectin', label: 'Calprotectina' },
  { key: 'crp', label: 'PCR' },
  { key: 'endoscopy', label: 'Endoscopia' },
  { key: 'colonoscopy', label: 'Colonoscopia' },
  { key: 'tuberculosisScreening', label: 'Tamizaje TB' },
  { key: 'enterography', label: 'Enterografía' },
  { key: 'lastFollowUpDate', label: 'Último seguimiento' },
  { key: 'nextFollowUpDate', label: 'Próximo seguimiento' },
] as const;
type PatientColumnKey = (typeof TABLE_COLUMNS)[number]['key'];
const DEFAULT_COLUMNS: PatientColumnKey[] = ['id', 'diagnosis', 'alerts', 'age', 'sex', 'eps', 'currentTreatment', 'clinicalResponse', 'calprotectin', 'crp', 'nextFollowUpDate'];

const ADVANCED_THERAPIES = [
  'Infliximab',
  'Vedolizumab',
  'Adalimumab',
  'Guselkumab',
  'Ustekinumab',
  'Upadacitinib',
  'Tofacitinib',
];

const COLORS = ['#7c3aed', '#db2777', '#3b82f6', '#10b981', '#f59e0b', '#64748b'];
const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}

type FollowUpStatus = { label: string; tone: 'overdue' | 'soon' | 'current' | 'missing'; isAlert: boolean };

function followUpStatus(patient: EiiDemoPatient): FollowUpStatus {
  if (!patient.nextFollowUpDate) return { label: 'Sin fecha', tone: 'missing', isAlert: true };
  if (patient.nextFollowUpDate < EII_REFERENCE_DATE) return { label: 'Control vencido', tone: 'overdue', isAlert: true };
  const daysUntil = (Date.parse(`${patient.nextFollowUpDate}T00:00:00Z`) - Date.parse(`${EII_REFERENCE_DATE}T00:00:00Z`)) / 86_400_000;
  if (daysUntil <= 14) return { label: 'Próximo control', tone: 'soon', isAlert: false };
  return { label: 'Al día', tone: 'current', isAlert: false };
}

const FollowUpBadge: React.FC<{ patient: EiiDemoPatient }> = ({ patient }) => {
  const status = followUpStatus(patient);
  const styles = {
    overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
    soon: 'bg-amber-50 text-amber-800 ring-amber-200',
    current: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    missing: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return <span title="Estado de demostración calculado a partir de la fecha registrada" className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[status.tone]}`}>{status.label}</span>;
};

function countBy(pacientes: EiiDemoPatient[], getLabel: (paciente: EiiDemoPatient) => string) {
  const counts = new Map<string, number>();
  pacientes.forEach((paciente) => {
    const label = getLabel(paciente) || 'Sin dato';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return counts;
}

function treatmentCategory(patient: EiiDemoPatient) {
  const treatment = patient.currentTreatment.toLocaleLowerCase('es');
  if (patient.usesBiologicTherapy.toLocaleLowerCase('es') === 'sí') return 'Terapia biológica';
  if (treatment.startsWith('mesalazina')) return '5-ASA';
  if (['upadacitinib', 'tofacitinib'].includes(treatment)) return 'Pequeñas moléculas';
  if (['sin tratamiento', 'no aplica', ''].includes(treatment)) return 'Sin tratamiento';
  return 'Otros tratamientos';
}

function tableCellValue(patient: EiiDemoPatient, key: PatientColumnKey) {
  switch (key) {
    case 'id': return patient.id.replace('EII-DEMO-', 'Demo ');
    case 'alerts': return followUpStatus(patient).label;
    case 'age': return `${patient.age} años`;
    case 'usesBiologicTherapy': return patient.usesBiologicTherapy;
    case 'hemoglobin': return `${patient.hemoglobin} g/dL`;
    case 'calprotectin': return `${patient.calprotectin} µg/g`;
    case 'crp': return `${patient.crp} mg/L`;
    case 'endoscopy': return formatDate(patient.endoscopy);
    case 'colonoscopy': return formatDate(patient.colonoscopy);
    case 'lastFollowUpDate': return formatDate(patient.lastFollowUpDate);
    case 'nextFollowUpDate': return formatDate(patient.nextFollowUpDate);
    default: return patient[key] || 'No registrado';
  }
}

function matchesChartFilter(patient: EiiDemoPatient, filter: ChartFilter | null) {
  if (!filter) return true;
  switch (filter.kind) {
    case 'diagnosis': return patient.diagnosis === filter.value;
    case 'sex': return patient.sex === filter.value;
    case 'age': {
      const group = AGE_GROUPS.find((item) => item.label === filter.value);
      return Boolean(group && patient.age >= group.min && patient.age <= group.max);
    }
    case 'treatment': return treatmentCategory(patient) === filter.value;
    case 'advancedTherapy': return patient.currentTreatment.toLocaleLowerCase('es') === filter.value.toLocaleLowerCase('es');
    case 'clinicalResponse': return patient.clinicalResponse === filter.value;
    case 'endoscopicResponse': return patient.endoscopicResponse === filter.value;
    default: return true;
  }
}

function matchesChartFilters(patient: EiiDemoPatient, filters: ChartFilters, excludeKind?: ChartFilterKind) {
  return (Object.entries(filters) as [ChartFilterKind, string][]).every(([kind, value]) => (
    kind === excludeKind || matchesChartFilter(patient, { kind, value })
  ));
}

const CardShell: React.FC<React.PropsWithChildren<{ title: string; subtitle?: string; className?: string }>> = ({
  title,
  subtitle,
  className = '',
  children,
}) => (
  <section className={`rounded-2xl border border-[#ececf1] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const DonutCard: React.FC<{
  title: string;
  subtitle?: string;
  items: DistributionItem[];
  total: number;
  onSelect?: (item: DistributionItem) => void;
  selectedLabel?: string | null;
}> = ({ title, subtitle, items, total, onSelect, selectedLabel }) => {
  let cumulative = 0;
  const segments = items.filter((item) => item.value > 0).map((item) => {
    const start = cumulative;
    cumulative += total ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${Math.min(cumulative, 100)}%`;
  });
  if (cumulative < 100) segments.push(`#e9eaf1 ${cumulative}% 100%`);
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <CardShell title={title} subtitle={subtitle}>
      <div className="flex min-h-[112px] items-center gap-4">
        <div
          className="h-[94px] w-[94px] shrink-0 rounded-full p-[9px]"
          style={{ background: `conic-gradient(${segments.join(', ') || '#e9eaf1 0% 100%'})` }}
          role="img"
          aria-label={`${title}: ${items.map((item) => `${item.label}, ${item.value}`).join('; ')}`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center">
            <strong className="text-lg leading-none tabular-nums text-slate-800">{total}</strong>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-400">Total</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {visibleItems.length ? visibleItems.map((item) => {
            const percent = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => onSelect?.(item)}
                aria-pressed={selectedLabel === item.label}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] transition hover:bg-violet-50 ${selectedLabel === item.label ? 'bg-violet-50 ring-1 ring-violet-200' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <strong className="tabular-nums text-slate-800">{item.value}</strong>
                <span className="w-8 text-right tabular-nums text-slate-400">{percent}%</span>
              </button>
            );
          }) : <p className="text-xs text-slate-500">Sin registros para mostrar.</p>}
        </div>
      </div>
    </CardShell>
  );
};

const VerticalBarChart: React.FC<{
  title: string;
  subtitle?: string;
  items: DistributionItem[];
  total: number;
  onSelect?: (item: DistributionItem) => void;
  selectedLabel?: string | null;
}> = ({ title, subtitle, items, total, onSelect, selectedLabel }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const axisMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((axisMax * (4 - index)) / 4));

  return (
    <CardShell title={title} subtitle={subtitle}>
      <div className="grid grid-cols-[26px_minmax(0,1fr)] gap-2">
        <div className="flex h-36 flex-col justify-between pb-1 text-[10px] tabular-nums text-slate-400" aria-hidden="true">
          {ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}
        </div>
        <div>
          <div className="relative h-36 border-b border-l border-slate-200">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {ticks.map((tick, index) => <span key={`${tick}-${index}`} className="border-t border-slate-100" />)}
            </div>
            <div className="absolute inset-0 grid items-end gap-2 px-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
              {items.map((item) => {
                const height = item.value ? Math.max(4, (item.value / axisMax) * 100) : 0;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => onSelect?.(item)}
                    aria-pressed={selectedLabel === item.label}
                    aria-label={`Filtrar por ${item.label}: ${item.value} pacientes`}
                    className="relative flex h-full w-full flex-col items-center justify-end focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <strong className="z-10 mb-1 text-xs tabular-nums text-slate-700">{item.value}</strong>
                    <div
                      className={`w-full max-w-[72px] rounded-t-md transition-[height,opacity,box-shadow] duration-500 ${selectedLabel && selectedLabel !== item.label ? 'opacity-35' : 'opacity-90'} ${selectedLabel === item.label ? 'ring-2 ring-violet-300 ring-offset-1' : ''}`}
                      style={{ height: `${height * 0.84}%`, backgroundColor: item.color }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 grid gap-2 text-center text-[10px] leading-tight text-slate-500" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => (
              <button key={item.label} type="button" onClick={() => onSelect?.(item)} aria-pressed={selectedLabel === item.label} className="rounded px-1 hover:bg-violet-50 hover:text-violet-700">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-right text-[10px] text-slate-400">Pacientes · n={total}</p>
    </CardShell>
  );
};

const PatientCountCard: React.FC<{ total: number; alertCount: number; onClick: () => void; hasFilters: boolean }> = ({ total, alertCount, onClick, hasFilters }) => (
  <button
    type="button"
    onClick={onClick}
    title={hasFilters ? 'Limpiar filtros y mostrar todos los registros' : 'Indicadores de la cohorte ficticia'}
    aria-label={`Mostrar la base completa de ${total} pacientes; ${alertCount} con alerta en la vista actual`}
    className="relative flex h-[200px] min-h-[200px] self-start flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-[#a78bfa] p-5 text-left text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-violet-50">
        <UsersRound className="h-4 w-4" aria-hidden="true" />
        Pacientes
      </div>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white/90" aria-hidden="true">
        <img src={colonIcon} alt="" className="h-8 w-8 brightness-0 invert" />
      </span>
    </div>
    <div>
      <div className="text-5xl font-bold tracking-tight tabular-nums">{total}</div>
      <p className="mt-1 text-xs font-medium text-violet-50">{hasFilters ? 'Clic para ver toda la cohorte' : 'en la cohorte EII de demostración'}</p>
    </div>
    <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-3 text-[11px]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-white/95">
        <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />{alertCount} con alertas
      </span>
      <span className="whitespace-nowrap text-right text-violet-50">{total} en base local</span>
    </div>
  </button>
);

export const EiiCenterDashboard: React.FC<EiiCenterDashboardProps> = ({ centro, pacientes }) => {
  const [search, setSearch] = useState('');
  const [activeChartFilters, setActiveChartFilters] = useState<ChartFilters>({});
  const diagnosisFilter = activeChartFilters.diagnosis || 'Todas';
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPatient, setSelectedPatient] = useState<EiiDemoPatient | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<PatientColumnKey[]>(DEFAULT_COLUMNS);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const counts = useMemo(() => {
    const forChart = (kind: ChartFilterKind) => pacientes.filter((patient) => matchesChartFilters(patient, activeChartFilters, kind));
    const diagnosisPatients = forChart('diagnosis');
    const sexPatients = forChart('sex');
    const agePatients = forChart('age');
    const treatmentPatients = forChart('treatment');
    const advancedTherapyPatients = forChart('advancedTherapy');
    const clinicalResponsePatients = forChart('clinicalResponse');
    const endoscopicResponsePatients = forChart('endoscopicResponse');

    const diagnosis = countBy(diagnosisPatients, (p) => p.diagnosis);
    const sex = countBy(sexPatients, (p) => p.sex);
    const clinicalResponse = countBy(clinicalResponsePatients, (p) => p.clinicalResponse);
    const endoscopicResponse = countBy(endoscopicResponsePatients, (p) => p.endoscopicResponse);
    const treatmentCounts = countBy(treatmentPatients, treatmentCategory);
    const ages = AGE_GROUPS.map((group) => ({
      label: group.label,
      value: agePatients.filter((p) => p.age >= group.min && p.age <= group.max).length,
      color: COLORS[2],
    }));

    const treatmentTypes = ['Terapia biológica', '5-ASA', 'Pequeñas moléculas', 'Otros tratamientos', 'Sin tratamiento']
      .map((label, index) => ({ label, value: treatmentCounts.get(label) || 0, color: COLORS[index] }));

    const advancedTherapies = ADVANCED_THERAPIES.map((therapy, index) => ({
      label: therapy,
      value: advancedTherapyPatients.filter((p) => p.currentTreatment.toLocaleLowerCase('es') === therapy.toLocaleLowerCase('es')).length,
      color: COLORS[index % COLORS.length],
    }));

    return {
      diagnosis: {
        items: [
          { label: 'Enfermedad de Crohn', value: diagnosis.get('Enfermedad de Crohn') || 0, color: COLORS[0] },
          { label: 'Colitis ulcerativa', value: diagnosis.get('Colitis ulcerativa') || 0, color: COLORS[1] },
        ] as DistributionItem[],
        total: diagnosisPatients.length,
      },
      sex: {
        items: [
          { label: 'Femenino', value: sex.get('Femenino') || 0, color: '#db2777' },
          { label: 'Masculino', value: sex.get('Masculino') || 0, color: '#2563eb' },
        ] as DistributionItem[],
        total: sexPatients.length,
      },
      ages: { items: ages, total: agePatients.length },
      treatmentTypes: { items: treatmentTypes, total: treatmentPatients.length },
      advancedTherapies: {
        items: advancedTherapies,
        total: advancedTherapyPatients.filter((p) => p.usesBiologicTherapy.toLocaleLowerCase('es') === 'sí').length,
      },
      clinicalResponse: {
        items: ['Respuesta completa', 'Respuesta parcial', 'Sin respuesta'].map((label, index) => ({
          label,
          value: clinicalResponse.get(label) || 0,
          color: COLORS[index],
        })),
        total: clinicalResponsePatients.length,
      },
      endoscopicResponse: {
        items: ['Remisión', 'Actividad leve', 'Actividad moderada', 'Actividad severa'].map((label, index) => ({
          label,
          value: endoscopicResponse.get(label) || 0,
          color: ['#0f766e', '#65a30d', '#d97706', '#dc2626'][index],
        })),
        total: endoscopicResponsePatients.length,
      },
    };
  }, [activeChartFilters, pacientes]);

  const cohortPatients = useMemo(
    () => pacientes.filter((patient) => matchesChartFilters(patient, activeChartFilters)),
    [activeChartFilters, pacientes],
  );
  const pendingConsentCount = cohortPatients.filter((p) => p.consentCenter.toLocaleLowerCase('es') === 'pendiente').length;
  const alertCount = cohortPatients.filter((p) => followUpStatus(p).isAlert).length;
  const upcomingFollowUpCount = cohortPatients.filter((p) => followUpStatus(p).tone === 'soon').length;

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return pacientes.filter((patient) => {
      const matchesTerm = !term || Object.values(patient).some((value) => String(value).toLocaleLowerCase('es').includes(term));
      return matchesTerm && matchesChartFilters(patient, activeChartFilters);
    });
  }, [activeChartFilters, pacientes, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagePatients = filteredPatients.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const selectedPatientIndex = selectedPatient ? filteredPatients.findIndex((patient) => patient.id === selectedPatient.id) : -1;

  const toggleChartFilter = (kind: ChartFilterKind, item: DistributionItem) => {
    setActiveChartFilters((current) => {
      const next = { ...current };
      if (next[kind] === item.label) delete next[kind];
      else next[kind] = item.label;
      return next;
    });
    setCurrentPage(1);
  };

  const handleDiagnosisFilter = (value: string) => {
    setActiveChartFilters((current) => {
      const next = { ...current };
      if (value === 'Todas') delete next.diagnosis;
      else next.diagnosis = value;
      return next;
    });
    setCurrentPage(1);
  };

  const removeChartFilter = (kind: ChartFilterKind) => {
    setActiveChartFilters((current) => {
      const next = { ...current };
      delete next[kind];
      return next;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setActiveChartFilters({});
    setCurrentPage(1);
  };

  const toggleColumn = (key: PatientColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(key)) return current.length > 1 ? current.filter((column) => column !== key) : current;
      return TABLE_COLUMNS.map((column) => column.key).filter((column) => current.includes(column) || column === key);
    });
  };

  return (
    <div className="page-enter mx-auto max-w-[1320px] space-y-4">
      <section className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between" aria-label="Información de la cohorte">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            Datos ficticios de demostración
          </span>
          <span className="text-xs text-slate-500">Corte {formatDate(EII_REFERENCE_DATE)}</span>
          <span className="text-xs text-slate-500">Crohn y colitis ulcerativa</span>
          <span className="hidden text-xs font-medium text-slate-500 md:inline">{centro.nombre}</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 shrink-0" />Alertas y WhatsApp en modo demostración · sin conexión a SAHI ni envío real</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores y distribución de pacientes">
        <PatientCountCard total={pacientes.length} alertCount={alertCount} onClick={clearFilters} hasFilters={Object.keys(activeChartFilters).length > 0 || Boolean(search.trim())} />
        <VerticalBarChart
          title="Pacientes por diagnóstico"
          subtitle="Crohn frente a colitis ulcerativa"
          items={counts.diagnosis.items}
          total={counts.diagnosis.total}
          onSelect={(item) => toggleChartFilter('diagnosis', item)}
          selectedLabel={activeChartFilters.diagnosis || null}
        />
        <DonutCard title="Distribución por sexo" items={counts.sex.items} total={counts.sex.total} onSelect={(item) => toggleChartFilter('sex', item)} selectedLabel={activeChartFilters.sex || null} />
        <DonutCard title="Tipo de tratamiento" subtitle="Biológica, 5-ASA y otros" items={counts.treatmentTypes.items} total={counts.treatmentTypes.total} onSelect={(item) => toggleChartFilter('treatment', item)} selectedLabel={activeChartFilters.treatment || null} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4" aria-label="Distribución por edad y terapias">
        <div className="xl:col-span-2">
          <VerticalBarChart title="Distribución por grupo etario" subtitle="Edad calculada al corte de la base" items={counts.ages.items} total={counts.ages.total} onSelect={(item) => toggleChartFilter('age', item)} selectedLabel={activeChartFilters.age || null} />
        </div>
        <div className="xl:col-span-2">
          <DonutCard title="Terapia avanzada registrada" subtitle="Sobre los registros marcados con terapia biológica" items={counts.advancedTherapies.items} total={counts.advancedTherapies.total} onSelect={(item) => toggleChartFilter('advancedTherapy', item)} selectedLabel={activeChartFilters.advancedTherapy || null} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4" aria-label="Respuestas registradas">
        <div className="xl:col-span-2">
          <DonutCard title="Respuesta clínica reportada" subtitle="Campo didáctico, no validado para decisiones clínicas" items={counts.clinicalResponse.items} total={counts.clinicalResponse.total} onSelect={(item) => toggleChartFilter('clinicalResponse', item)} selectedLabel={activeChartFilters.clinicalResponse || null} />
        </div>
        <div className="xl:col-span-2">
          <DonutCard title="Respuesta endoscópica reportada" subtitle="Campo didáctico de la base ficticia" items={counts.endoscopicResponse.items} total={counts.endoscopicResponse.total} onSelect={(item) => toggleChartFilter('endoscopicResponse', item)} selectedLabel={activeChartFilters.endoscopicResponse || null} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-600">
        <strong className="text-slate-800">Flujo descrito en la ficha, aún no activo:</strong>{' '}
        seguimiento cada 2 meses para terapia biológica y cada 3 meses para 5-ASA. Las alertas asociadas a CIE-10 K500, K501, K508, K509, K510, K518 y K519 requieren integración con SAHI y validación del protocolo.
        <span className="ml-2 font-medium text-amber-700">El estado que ves abajo es una señal visual de demostración calculada por fecha.</span>
      </section>

      <section className="rounded-2xl border border-[#ececf1] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#ececf1] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700" aria-hidden="true">♧</span>
              Pacientes del centro
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">{filteredPatients.length} de {pacientes.length}</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500">Listado ficticio · selecciona una fila para abrir la ficha y navegar entre pacientes</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setColumnMenuOpen((open) => !open)} aria-expanded={columnMenuOpen} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700">
                Columnas <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 tabular-nums">{visibleColumns.length}</span>
              </button>
              {columnMenuOpen && (
                <div className="absolute right-0 z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-xs text-slate-800">Columnas visibles</strong>
                    <button type="button" onClick={() => setColumnMenuOpen(false)} aria-label="Cerrar selector de columnas" className="rounded px-1 text-slate-400 hover:bg-slate-100">×</button>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {TABLE_COLUMNS.map((column) => (
                      <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-xs text-slate-600 hover:bg-violet-50">
                        <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
              placeholder="Buscar ficha, EPS o tratamiento..."
              aria-label="Buscar pacientes EII"
              className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 sm:w-56"
            />
            <select
              value={diagnosisFilter}
              onChange={(event) => handleDiagnosisFilter(event.target.value)}
              aria-label="Filtrar por diagnóstico"
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-500"
            >
              <option>Todas</option>
              <option>Enfermedad de Crohn</option>
              <option>Colitis ulcerativa</option>
            </select>
          </div>
        </div>

        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500"><AlertTriangle className="h-3.5 w-3.5" />Alertas</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><AlertTriangle className="h-3 w-3" />{alertCount} con alerta</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700 ring-1 ring-inset ring-sky-200"><CalendarClock className="h-3 w-3" />{upcomingFollowUpCount} próximos controles</span>
            <span className="text-slate-500">Vista de demostración · no genera notificaciones reales</span>
          </div>
          {(Object.keys(activeChartFilters).length > 0 || search) && (
            <button type="button" onClick={clearFilters} className="font-semibold text-violet-700 hover:text-violet-900">Limpiar filtros</button>
          )}
        </div>
        {Object.keys(activeChartFilters).length > 0 && (
          <div className="mx-4 mt-2 flex flex-wrap items-center gap-2 text-xs text-violet-700">
            {(Object.entries(activeChartFilters) as [ChartFilterKind, string][]).map(([kind, value]) => (
              <button key={kind} type="button" onClick={() => removeChartFilter(kind)} aria-label={`Quitar filtro de ${CHART_FILTER_LABELS[kind]}`} className="rounded-full bg-violet-50 px-2.5 py-1 hover:bg-violet-100">
                {CHART_FILTER_LABELS[kind]}: {value} <span aria-hidden="true">×</span>
              </button>
            ))}
            <span className="text-slate-500">Los filtros se combinan entre gráficas; toca una categoría activa para quitarla.</span>
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1400px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {visibleColumns.map((key) => {
                  const column = TABLE_COLUMNS.find((item) => item.key === key);
                  return <th key={key} className="whitespace-nowrap px-3 py-3 font-semibold">{column?.label}</th>;
                })}
                <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Abrir ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagePatients.map((patient) => (
                <tr
                  key={patient.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir ficha de ${patient.id.replace('EII-DEMO-', 'Paciente Demo ')}`}
                  onClick={() => setSelectedPatient(patient)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedPatient(patient); } }}
                  className="cursor-pointer text-sm text-slate-700 transition hover:bg-violet-50/60 focus:bg-violet-50 focus:outline-none"
                >
                  {visibleColumns.map((key) => (
                    <td key={key} className={`whitespace-nowrap px-3 py-3.5 ${key === 'id' ? 'font-mono font-semibold text-violet-700' : key === 'diagnosis' ? 'font-medium text-slate-800' : ''}`}>
                      {key === 'alerts' ? <FollowUpBadge patient={patient} /> : tableCellValue(patient, key)}
                    </td>
                  ))}
                  <td className="px-3 py-3.5 text-right">
                    <span className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700">Ver ficha</span>
                  </td>
                </tr>
              ))}
              {pagePatients.length === 0 && (
                <tr><td colSpan={visibleColumns.length + 1} className="px-3 py-10 text-center text-sm text-slate-500">No hay pacientes que coincidan con los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#ececf1] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="eii-page-size">Mostrar</label>
            <select id="eii-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
              <option value={10}>10 pacientes</option>
              <option value={20}>20 pacientes</option>
              <option value={30}>30 pacientes</option>
            </select>
            <span>Mostrando {filteredPatients.length ? (safeCurrentPage - 1) * pageSize + 1 : 0} a {Math.min(safeCurrentPage * pageSize, filteredPatients.length)} de {filteredPatients.length} pacientes</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" aria-label="Página anterior" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40">‹</button>
            <span>Página {safeCurrentPage} de {totalPages}</span>
            <button type="button" aria-label="Página siguiente" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40">›</button>
          </div>
        </div>
        <div className="border-t border-[#ececf1] px-4 py-2 text-[10px] leading-relaxed text-slate-500">
          Muestra 100% ficticia · {pendingConsentCount} registros con consentimiento del centro pendiente · Los valores de laboratorio y las respuestas no son una valoración clínica.
        </div>
      </section>

      <EiiPatientDetailModal
        patient={selectedPatient}
        position={selectedPatientIndex + 1}
        total={filteredPatients.length}
        onClose={() => setSelectedPatient(null)}
        onNavigate={(direction) => {
          const nextPatient = filteredPatients[selectedPatientIndex + direction];
          if (nextPatient) setSelectedPatient(nextPatient);
        }}
      />
    </div>
  );
};
