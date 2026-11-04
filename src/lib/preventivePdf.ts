import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ORG_NAME } from './pdfExport';
import { statusColorRgb } from './statusColor';
import { effectiveStatus, fmtDate, recurrenceLabel, PM_PRIORITY, PM_STATUS, PM_TYPES, type Maintenance } from './preventiveMaintenance';

const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [75, 85, 99];
const LINE: [number, number, number] = [209, 213, 219];
const PAPER: [number, number, number] = [255, 255, 255];
const ZEBRA: [number, number, number] = [246, 248, 251];
const NI = 'Não informado';

export function generatePreventivePDF(options: {
  rows: Maintenance[]; section: string; singleSection: boolean; emitter: string; role: string;
  filters: string[]; summary: { label: string; value: number }[]; issuedAt: Date;
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 12;
  const text = (value: string | null) => value?.trim() || NI;
  const heading = () => {
    doc.setFillColor(...INK); doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(...PAPER); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('SECINFOR · EXÉRCITO BRASILEIRO · 14º B Log', M, 7);
    doc.setFontSize(13); doc.text('Relatório de Manutenção Preventiva', M, 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(ORG_NAME, W - M, 7, { align: 'right' });
    doc.text(`Emissão: ${format(options.issuedAt, 'dd/MM/yyyy HH:mm')}`, W - M, 12, { align: 'right' });
  };
  heading();
  let y = 28;
  doc.setFontSize(8); doc.setTextColor(...INK);
  for (const line of [`Seção: ${options.section}`, `Emissor: ${text(options.emitter)} · Perfil: ${options.role}`, `Filtros: ${options.filters.join(' · ') || 'Nenhum'}`]) {
    const lines = doc.splitTextToSize(line, W - M * 2) as string[];
    doc.text(lines, M, y); y += lines.length * 3.8 + 2;
  }
  const gap = 3, cw = (W - M * 2 - 2 * gap) / 3, ch = 16;
  options.summary.forEach((card, i) => {
    const x = M + (i % 3) * (cw + gap), cy = y + Math.floor(i / 3) * (ch + gap);
    doc.setFillColor(...ZEBRA); doc.setDrawColor(...LINE); doc.roundedRect(x, cy, cw, ch, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(card.label, x + 3, cy + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
    doc.text(String(card.value), x + 3, cy + 12);
  });
  y += 2 * (ch + gap) + 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text(`Total de registros exportados: ${options.rows.length}`, M, y); y += 5;
  const columns = ['Equipamento', 'Tipo de equipamento', ...(!options.singleSection ? ['Seção'] : []), 'Título da manutenção', 'Tipo da manutenção', 'Status', 'Prioridade', 'Agendada', 'Responsável', 'Início', 'Conclusão', 'Resultado', 'Próxima manutenção'];
  const statusIndex = options.singleSection ? 4 : 5, priorityIndex = statusIndex + 1;
  const rows = options.rows.map(m => [text(m.equipment_label), ({ notebook: 'Notebook', material: 'Material', outro: 'Outro equipamento' } as Record<string, string>)[m.equipment_type] || text(m.equipment_type),
    ...(!options.singleSection ? [text(m.section_name)] : []), `${text(m.title)}\n${recurrenceLabel(m)}`, PM_TYPES[m.maintenance_type] || text(m.maintenance_type),
    PM_STATUS[effectiveStatus(m)]?.label || m.status, PM_PRIORITY[m.priority]?.label || m.priority, fmtDate(m.scheduled_date), text(m.assigned_name),
    fmtDate(m.started_at), fmtDate(m.completed_at), text(m.result), fmtDate(m.next_due_date)]);
  if (rows.length) {
    autoTable(doc, {
      startY: y, head: [columns], body: rows, theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
      margin: { left: M, right: M, top: 28, bottom: 18 },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', valign: 'top', textColor: INK, lineColor: LINE, lineWidth: 0.15 },
      headStyles: { fillColor: INK, textColor: PAPER, fontStyle: 'bold' }, alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: { [options.singleSection ? 3 : 4]: { cellWidth: 23 }, [statusIndex]: { cellWidth: 19 }, [priorityIndex]: { cellWidth: 16 } },
      willDrawPage: () => { if (doc.getCurrentPageInfo().pageNumber > 1) heading(); },
      didParseCell: d => {
        if (d.section !== 'body' || ![statusIndex, priorityIndex].includes(d.column.index)) return;
        const map = d.column.index === statusIndex ? PM_STATUS : PM_PRIORITY;
        const color = Object.values(map).find(s => s.label === String(d.cell.raw))?.color;
        if (!color) return;
        const rgb = statusColorRgb(color);
        // Preserve the hue while ensuring contrast against both white and zebra rows.
        const light = (v: number) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
        while ((0.2126 * light(rgb[0]) + 0.7152 * light(rgb[1]) + 0.0722 * light(rgb[2])) > 0.14) {
          for (let i = 0; i < 3; i++) rgb[i] = Math.floor(rgb[i] * 0.9);
        }
        d.cell.styles.textColor = rgb; d.cell.styles.fontStyle = 'bold';
      },
    });
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Nenhuma manutenção corresponde aos filtros aplicados.', M, y + 6);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(...LINE); doc.line(M, H - 12, W - M, H - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    const section = doc.splitTextToSize(`SECINFOR · ${options.section}`, W - M * 2 - 35) as string[];
    doc.text(section.slice(0, 1), M, H - 7);
    doc.text(`Página ${page} de ${pages}`, W - M, H - 7, { align: 'right' });
  }
  doc.save(`manutencao_preventiva_${format(options.issuedAt, 'yyyy-MM-dd_HH-mm-ss')}.pdf`);
  return pages;
}