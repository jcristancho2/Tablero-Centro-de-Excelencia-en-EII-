import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, MapPin, MessageCircle, Phone, Send, UserRound, X } from 'lucide-react';
import { EiiDemoPatient, EII_REFERENCE_DATE } from '../data/eiiDemoPatients';

interface EiiPatientDetailModalProps {
  patient: EiiDemoPatient | null;
  position: number;
  total: number;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
}

type DetailTab = 'perfil' | 'controles' | 'sociodemografico';

const NOT_RECORDED = 'No registrado en la base ficticia';
const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatDate(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NOT_RECORDED;
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}

const DetailValue: React.FC<{ label: string; value: string | number; unit?: string }> = ({ label, value, unit }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
    <span className="shrink-0 text-xs text-slate-500">{label}</span>
    <span className="text-right text-xs font-medium text-slate-800">
      {value || value === 0 ? value : NOT_RECORDED}{unit && value !== '' ? ` ${unit}` : ''}
    </span>
  </div>
);

const DetailSection: React.FC<React.PropsWithChildren<{ title: string; icon?: React.ReactNode }>> = ({ title, icon, children }) => (
  <section className="rounded-xl border border-[#ececf1] bg-white p-4">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
      {icon || <FileText className="h-4 w-4 text-violet-600" />}{title}
    </h3>
    {children}
  </section>
);

const StatusPill: React.FC<{ value: string }> = ({ value }) => {
  const lower = value.toLocaleLowerCase('es');
  const style = lower === 'sí' || lower === 'remisión' || lower === 'respuesta completa'
    ? 'bg-emerald-50 text-emerald-700'
    : lower === 'pendiente' || lower.includes('actividad') || lower === 'sin respuesta'
      ? 'bg-amber-50 text-amber-800'
      : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${style}`}>{value}</span>;
};

export const EiiPatientDetailModal: React.FC<EiiPatientDetailModalProps> = ({ patient, position, total, onClose, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('perfil');
  const [whatsAppPreviewOpen, setWhatsAppPreviewOpen] = useState(false);
  const [whatsAppDraft, setWhatsAppDraft] = useState('Hola, te recordamos que tienes un seguimiento registrado con el Centro de Excelencia en Enfermedad Inflamatoria Intestinal. Si necesitas revisar la fecha, comunícate con el centro.');
  const [simulationRecorded, setSimulationRecorded] = useState(false);

  useEffect(() => {
    setActiveTab('perfil');
    setWhatsAppPreviewOpen(false);
    setSimulationRecorded(false);
  }, [patient?.id]);
  useEffect(() => {
    if (!patient) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && position > 1) onNavigate(-1);
      if (event.key === 'ArrowRight' && position < total) onNavigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, patient, position, total]);

  if (!patient) return null;

  const idLabel = patient.id.replace('EII-DEMO-', 'Demo ');
  const timeline = [
    { title: 'Inicio de síntomas', date: patient.symptomOnsetDate, note: 'Fecha reportada en la base de demostración.' },
    { title: 'Diagnóstico de EII', date: patient.diagnosisDate, note: patient.diagnosis },
    { title: 'Ingreso al Centro de Excelencia', date: patient.centerEntryDate, note: 'Ingreso registrado en la muestra.' },
    { title: 'Último seguimiento reportado', date: patient.lastFollowUpDate, note: 'Última fecha de seguimiento disponible en la base.' },
    { title: 'Próximo seguimiento reportado', date: patient.nextFollowUpDate, note: 'Fecha consignada en la base; no confirma que la cita se haya realizado.' },
  ].filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date));

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Perfil clínico', icon: <Activity className="h-3.5 w-3.5" /> },
    { id: 'controles', label: `Trayectoria de controles (${timeline.length})`, icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { id: 'sociodemografico', label: 'Datos sociodemográficos y contacto', icon: <UserRound className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[#ececf1] bg-white shadow-2xl animate-in zoom-in-95 duration-150 sm:max-h-[92vh] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="eii-patient-title">
        <header className="flex items-start justify-between gap-3 border-b border-[#ececf1] bg-gradient-to-r from-slate-50 via-white to-violet-50/40 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-sm font-bold text-white shadow-sm">EII</div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="eii-patient-title" className="text-base font-bold text-slate-900 sm:text-lg">Paciente {idLabel}</h2>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Muestra ficticia</span>
              </div>
              <p className="text-xs text-slate-500">{patient.age} años · {patient.sex} · {patient.diagnosis}</p>
              <p className="font-mono text-[10px] text-violet-700">Código de ficha: {patient.id}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 hidden text-[10px] tabular-nums text-slate-400 sm:inline">{position} de {total}</span>
            <button type="button" onClick={() => onNavigate(-1)} disabled={position <= 1} aria-label="Ficha anterior" className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onNavigate(1)} disabled={position >= total} aria-label="Ficha siguiente" className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="ml-1 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-4 overflow-x-auto border-b border-[#ececf1] px-4 pt-3 text-xs sm:px-5" role="tablist" aria-label="Secciones de la ficha">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 font-semibold transition-colors ${activeTab === tab.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'perfil' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Diagnóstico', value: patient.diagnosis },
                  { label: 'Tratamiento actual', value: patient.currentTreatment },
                  { label: 'Respuesta clínica', value: patient.clinicalResponse },
                  { label: 'Próximo seguimiento', value: formatDate(patient.nextFollowUpDate) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
                    <strong className="mt-1 block text-xs leading-snug text-slate-800">{item.value || NOT_RECORDED}</strong>
                  </div>
                ))}
              </div>

              <DetailSection title="Historia de la enfermedad" icon={<FileText className="h-4 w-4 text-violet-600" />}>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <DetailValue label="Inicio de síntomas" value={formatDate(patient.symptomOnsetDate)} />
                  <DetailValue label="Fecha de diagnóstico" value={formatDate(patient.diagnosisDate)} />
                  <DetailValue label="Cirugías reportadas" value={patient.surgeries} />
                  <DetailValue label="Manifestaciones extraintestinales" value={patient.extraintestinalManifestations} />
                  <DetailValue label="Uso de terapia biológica" value={patient.usesBiologicTherapy} />
                </div>
              </DetailSection>

              <DetailSection title="Respuesta y actividad reportadas" icon={<Activity className="h-4 w-4 text-violet-600" />}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Respuesta clínica', patient.clinicalResponse],
                    ['Remisión clínica', patient.clinicalRemission],
                    ['Respuesta bioquímica', patient.biochemicalResponse],
                    ['Remisión bioquímica', patient.biochemicalRemission],
                    ['Respuesta endoscópica', patient.endoscopicResponse],
                    ['Remisión endoscópica', patient.endoscopicRemission],
                    ['Remisión histológica', patient.histologicalRemission],
                  ].map(([label, value]) => (
                    <div key={label} className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-[11px] text-slate-600">{label}</span>
                      <StatusPill value={value || NOT_RECORDED} />
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title="Exámenes y biomarcadores" icon={<ClipboardList className="h-4 w-4 text-violet-600" />}>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <DetailValue label="Hemoglobina" value={patient.hemoglobin} unit="g/dL" />
                  <DetailValue label="Calprotectina fecal" value={patient.calprotectin} unit="µg/g" />
                  <DetailValue label="Proteína C reactiva (PCR)" value={patient.crp} unit="mg/L" />
                  <DetailValue label="Tamizaje de tuberculosis" value={patient.tuberculosisScreening} />
                  <DetailValue label="Endoscopia" value={formatDate(patient.endoscopy)} />
                  <DetailValue label="Colonoscopia" value={formatDate(patient.colonoscopy)} />
                  <DetailValue label="Enterografía" value={patient.enterography} />
                </div>
              </DetailSection>

              <DetailSection title="Campos no incluidos en la base EII" icon={<UserRound className="h-4 w-4 text-violet-600" />}>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <DetailValue label="Peso / talla / IMC" value={NOT_RECORDED} />
                  <DetailValue label="Grupo sanguíneo (RH)" value={NOT_RECORDED} />
                  <DetailValue label="Vía de acceso" value={NOT_RECORDED} />
                </div>
              </DetailSection>

              <DetailSection title="Consentimientos registrados" icon={<Activity className="h-4 w-4 text-violet-600" />}>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <DetailValue label="Consentimiento del centro" value={patient.consentCenter} />
                  <DetailValue label="Terapia biológica" value={patient.consentBiologicTherapy} />
                  <DetailValue label="Inmunosupresores" value={patient.consentImmunosuppressant} />
                  <DetailValue label="Mesalazina" value={patient.consentMesalazine} />
                </div>
              </DetailSection>
            </div>
          )}

          {activeTab === 'controles' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Cronología construida solo con las fechas disponibles en la muestra. No confirma asistencia ni cumplimiento del protocolo.</p>
              <div className="relative ml-3 space-y-3 border-l-2 border-violet-100 pl-5">
                {timeline.map((event) => {
                  const isNext = event.title === 'Próximo seguimiento reportado';
                  const isBeforeCutoff = isNext && event.date < EII_REFERENCE_DATE;
                  return (
                    <article key={`${event.title}-${event.date}`} className="relative rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                      <span className={`absolute -left-[29px] top-4 h-3 w-3 rounded-full border-2 border-white ${isBeforeCutoff ? 'bg-amber-500' : isNext ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{event.title}</h3>
                          <p className="mt-1 text-[11px] text-slate-500">{event.note}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isBeforeCutoff ? 'bg-amber-50 text-amber-800' : isNext ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isBeforeCutoff ? 'Fecha anterior al corte' : isNext ? 'Próxima fecha registrada' : 'Fecha registrada'}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-slate-600">{formatDate(event.date)}</p>
                    </article>
                  );
                })}
              </div>
              <DetailSection title="Frecuencia descrita por el centro" icon={<CalendarDays className="h-4 w-4 text-violet-600" />}>
                <p className="text-xs leading-relaxed text-slate-600">La ficha técnica describe controles cada 2 meses para terapia biológica y cada 3 meses para 5-ASA. Esta demostración no programa citas ni genera recordatorios.</p>
              </DetailSection>
            </div>
          )}

          {activeTab === 'sociodemografico' && (
            <div className="space-y-3">
              <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-[11px] leading-relaxed text-violet-800">La muestra no contiene nombres, documentos ni datos de contacto. Los campos ausentes se marcan como no registrados; no se usan datos de los pacientes de las capturas de referencia.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailSection title="Aseguramiento y EPS" icon={<ClipboardList className="h-4 w-4 text-violet-600" />}>
                  <DetailValue label="EPS" value={patient.eps} />
                  <DetailValue label="Régimen" value={NOT_RECORDED} />
                  <DetailValue label="Plan" value={NOT_RECORDED} />
                  <DetailValue label="Tipo de afiliación" value={NOT_RECORDED} />
                </DetailSection>
                <DetailSection title="Ubicación y vivienda" icon={<MapPin className="h-4 w-4 text-violet-600" />}>
                  <DetailValue label="Zona" value={NOT_RECORDED} />
                  <DetailValue label="Dirección" value={NOT_RECORDED} />
                  <DetailValue label="Con quién vive" value={NOT_RECORDED} />
                </DetailSection>
                <DetailSection title="Canales de contacto" icon={<Phone className="h-4 w-4 text-violet-600" />}>
                  <DetailValue label="Teléfono móvil" value={NOT_RECORDED} />
                  <DetailValue label="Teléfono de casa" value={NOT_RECORDED} />
                  <DetailValue label="Correo electrónico" value={NOT_RECORDED} />
                </DetailSection>
                <DetailSection title="Datos socioculturales" icon={<UserRound className="h-4 w-4 text-violet-600" />}>
                  <DetailValue label="Edad" value={patient.age} unit="años" />
                  <DetailValue label="Sexo" value={patient.sex} />
                  <DetailValue label="Estado civil" value={NOT_RECORDED} />
                  <DetailValue label="Escolaridad / ocupación" value={NOT_RECORDED} />
                  <DetailValue label="Etnia / religión" value={NOT_RECORDED} />
                </DetailSection>
              </div>
              <DetailSection title="Identificación de la muestra" icon={<FileText className="h-4 w-4 text-violet-600" />}>
                <DetailValue label="Código de ficha ficticio" value={patient.id} />
                <DetailValue label="Documento legal / nombre" value="Omitidos en el archivo de demostración" />
              </DetailSection>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#ececf1] bg-slate-50 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Datos ficticios de demostración · Sin conexión a SAHI · No usar para decisiones clínicas</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setWhatsAppPreviewOpen(true); setSimulationRecorded(false); }} title="Abrir una vista previa local; no envía mensajes reales" className="inline-flex items-center gap-1.5 rounded-lg border border-[#0d9488]/30 bg-[#f0fdfa] px-3 py-1.5 font-semibold text-[#0f766e] shadow-sm transition-colors hover:bg-[#ccfbf1]">
              <MessageCircle className="h-3.5 w-3.5" />Enviar WhatsApp
            </button>
            <button type="button" onClick={() => onNavigate(-1)} disabled={position <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">Anterior</button>
            <button type="button" onClick={() => onNavigate(1)} disabled={position >= total} className="rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-40">Siguiente</button>
          </div>
        </footer>
      </div>

      {whatsAppPreviewOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWhatsAppPreviewOpen(false); }}>
          <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#ececf1] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="eii-whatsapp-title">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
                <div>
                  <h3 id="eii-whatsapp-title" className="text-sm font-bold text-slate-900">Enviar WhatsApp</h3>
                  <p className="text-[11px] text-slate-500">Vista de demostración para {idLabel}</p>
                </div>
              </div>
              <button type="button" onClick={() => setWhatsAppPreviewOpen(false)} aria-label="Cerrar vista previa de WhatsApp" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </header>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p><strong>Modo demostración:</strong> este prototipo no tiene WhatsApp conectado ni almacena contactos. Puedes revisar el mensaje y simular la acción; no se enviará.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Destinatario</span>
                <span className="mt-1 block text-xs font-semibold text-slate-800">Paciente {idLabel} · teléfono no registrado</span>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Vista previa del mensaje</span>
                <textarea value={whatsAppDraft} onChange={(event) => { setWhatsAppDraft(event.target.value); setSimulationRecorded(false); }} rows={4} className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" />
              </label>

              {simulationRecorded && (
                <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Simulación registrada solo en esta pantalla. No se envió ni guardó ningún mensaje real.
                </p>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-[10px] text-slate-500">Canal WhatsApp: no conectado</span>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setWhatsAppPreviewOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">Cerrar</button>
                <button type="button" disabled={!whatsAppDraft.trim()} onClick={() => setSimulationRecorded(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" />Simular envío
                </button>
              </div>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
};
