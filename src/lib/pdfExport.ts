import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const ORG_NAME = 'Seção de Informática — 14º B Log';
export const SYSTEM_NAME = 'Sec Infor APP';

export type ReportSummaryItem = { label: string; value: string | number };

export type CellColorMap = Record<string, [number, number, number]>;

type PDFReportOptions = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
  orientation?: 'portrait' | 'landscape';
  /** Seção/organização a que o relatório se refere. */
  section?: string | null;
  /** Usuário emissor do relatório. */
  emitter?: string | null;
  /** Filtros aplicados: "Status: Aberto", "Período: 30 dias"... */
  filters?: string[];
  /** Resumo executivo exibido no topo, em cartões. */
  summary?: ReportSummaryItem[];
  /** Índice da coluna que recebe cor dinâmica (ex.: status). */
  colorColumnIndex?: number;
  /** Mapa valor-da-célula -> cor RGB (vinda da configuração do status). */
  colorMap?: CellColorMap;
  /** Larguras relativas opcionais por coluna. */
  columnWidths?: Record<number, number>;
};

const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [209, 213, 219];
const ZEBRA: [number, number, number] = [246, 248, 251];

/**
 * Gera um relatório PDF com identidade executiva padronizada:
 * cabeçalho institucional, metadados de emissão, filtros, resumo,
 * tabela legível e rodapé com paginação.
 */
export function generatePDFReport(opts: PDFReportOptions) {
  const {
    title, subtitle, columns, rows, filename, orientation = 'portrait',
    section, emitter, filters, summary, colorColumnIndex, colorMap, columnWidths,
  } = opts;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  // ---------- Cabeçalho institucional ----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('EXÉRCITO BRASILEIRO · 14º B Log', M, 8.5);
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), M, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(ORG_NAME, pageWidth - M, 8.5, { align: 'right' });
  doc.text(
    `Emissão: ${format(now, 'dd/MM/yyyy')} às ${format(now, 'HH:mm')}`,
    pageWidth - M, 13, { align: 'right' },
  );
  if (emitter) doc.text(`Emissor: ${emitter}`, pageWidth - M, 17.5, { align: 'right' });

  let y = 28;
  doc.setTextColor(...INK);

  if (subtitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(subtitle, M, y);
    y += 5;
  }
  if (section) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Seção: ${section}`, M, y);
    y += 4.5;
  }

  // ---------- Filtros aplicados ----------
  if (filters && filters.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const text = `Filtros aplicados: ${filters.join('  ·  ')}`;
    const lines = doc.splitTextToSize(text, pageWidth - M * 2) as string[];
    doc.text(lines, M, y);
    y += lines.length * 3.6 + 1.5;
  }

  // ---------- Resumo executivo ----------
  if (summary && summary.length > 0) {
    const perRow = Math.min(summary.length, 4);
    const gap = 3;
    const cardW = (pageWidth - M * 2 - gap * (perRow - 1)) / perRow;
    const cardH = 14;
    summary.forEach((item, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = M + col * (cardW + gap);
      const cy = y + row * (cardH + gap);
      doc.setDrawColor(...LINE);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(x, cy, cardW, cardH, 1.6, 1.6, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(String(item.label).toUpperCase(), x + 3, cy + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(String(item.value), x + 3, cy + 11);
    });
    const rowsCount = Math.ceil(summary.length / perRow);
    y += rowsCount * (cardH + gap) + 2;
  }

  // ---------- Tabela ----------
  const columnStyles: Record<number, { cellWidth: number }> = {};
  if (columnWidths) {
    Object.entries(columnWidths).forEach(([k, v]) => { columnStyles[Number(k)] = { cellWidth: v }; });
  }

  autoTable(doc, {
    startY: y + 1,
    head: [columns],
    body: rows.map(r => r.map(c => (c === null || c === undefined || c === '' ? 'Não informado' : String(c)))),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 },
      overflow: 'linebreak',
      valign: 'middle',
      textColor: INK,
      lineColor: [228, 231, 237],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: INK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: { top: 2.6, right: 2.4, bottom: 2.6, left: 2.4 },
    },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles,
    margin: { left: M, right: M, bottom: 18 },
    didParseCell: (data) => {
      if (
        data.section === 'body' &&
        colorMap &&
        colorColumnIndex !== undefined &&
        data.column.index === colorColumnIndex
      ) {
        const key = String(data.cell.raw ?? '');
        const rgb = colorMap[key];
        if (rgb) {
          data.cell.styles.textColor = rgb;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ---------- Rodapé ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, pageHeight - 12, pageWidth - M, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${rows.length} registro(s)`, M, pageHeight - 7.5);
    doc.text(`${SYSTEM_NAME} · ${ORG_NAME}`, pageWidth / 2, pageHeight - 7.5, { align: 'center' });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - M, pageHeight - 7.5, { align: 'right' });
  }

  doc.save(`${filename}_${format(now, 'yyyy-MM-dd')}.pdf`);
}
