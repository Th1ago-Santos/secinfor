import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ORG_NAME, SYSTEM_NAME, type ReportSummaryItem, type CellColorMap } from './pdfExport';

const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [209, 213, 219];
const ZEBRA: [number, number, number] = [246, 248, 251];
const NI = 'Não informado';

export type CentralBlock = {
  title: string;
  metrics: ReportSummaryItem[];
  table?: {
    caption: string;
    columns: string[];
    rows: (string | number | null | undefined)[][];
    colorColumnIndex?: number;
    colorMap?: CellColorMap;
    emptyText?: string;
  };
};

export function generateCentralPDF(opts: {
  section: string; emitter: string; role: string;
  summary: ReportSummaryItem[]; blocks: CentralBlock[]; filename: string;
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const now = new Date();

  doc.setFillColor(...INK); doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text(`${SYSTEM_NAME.toUpperCase()} · EXÉRCITO BRASILEIRO · 14º B Log`, M, 8.5);
  doc.setFontSize(14); doc.text('CENTRAL DA SEÇÃO', M, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Seção: ${opts.section}`, M, 21);
  doc.setFontSize(7.5);
  doc.text(ORG_NAME, W - M, 8.5, { align: 'right' });
  doc.text(`Emissão: ${format(now, 'dd/MM/yyyy')} às ${format(now, 'HH:mm')}`, W - M, 13, { align: 'right' });
  doc.text(`Emissor: ${opts.emitter || NI} (${opts.role})`, W - M, 17.5, { align: 'right' });

  let y = 30;
  const cards = (items: ReportSummaryItem[], perRow: number, h: number) => {
    const gap = 3;
    const cw = (W - M * 2 - gap * (perRow - 1)) / perRow;
    items.forEach((it, i) => {
      const x = M + (i % perRow) * (cw + gap);
      const cy = y + Math.floor(i / perRow) * (h + gap);
      doc.setDrawColor(...LINE); doc.setFillColor(250, 251, 253);
      doc.roundedRect(x, cy, cw, h, 1.6, 1.6, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...MUTED);
      doc.text(String(it.label).toUpperCase(), x + 3, cy + 4.8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(h > 12 ? 11 : 9.5); doc.setTextColor(...INK);
      doc.text(String(it.value ?? NI), x + 3, cy + h - 3);
    });
    y += Math.ceil(items.length / perRow) * (h + gap) + 1;
  };

  cards(opts.summary, 4, 14);

  const ensure = (need: number) => { if (y + need > H - 20) { doc.addPage(); y = 16; } };

  for (const b of opts.blocks) {
    ensure(40);
    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text(b.title, M, y);
    doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(M, y + 1.5, W - M, y + 1.5);
    y += 5;
    cards(b.metrics, Math.min(b.metrics.length, 6), 11);
    if (b.table) {
      ensure(18);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(`${b.table.caption} (${b.table.rows.length} registro(s))`, M, y + 2);
      y += 3.5;
      const rows = b.table.rows.length
        ? b.table.rows.map(r => r.map(c => (c === null || c === undefined || c === '' ? NI : String(c))))
        : [[b.table.emptyText || 'Nenhum registro.', ...Array(b.table.columns.length - 1).fill('')]];
      const t = b.table;
      autoTable(doc, {
        startY: y,
        head: [t.columns], body: rows, theme: 'grid',
        styles: { font: 'helvetica', fontSize: 7.8, cellPadding: 1.8, overflow: 'linebreak', valign: 'middle', textColor: INK, lineColor: [228, 231, 237], lineWidth: 0.15 },
        headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: ZEBRA },
        margin: { left: M, right: M, bottom: 18, top: 16 },
        didParseCell: (d) => {
          if (d.section === 'body' && t.colorMap && t.colorColumnIndex === d.column.index) {
            const rgb = t.colorMap[String(d.cell.raw ?? '')];
            if (rgb) {
              // escurece cores claras (ex.: amarelo) para manter leitura no papel
              const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
              const f = lum > 150 ? 0.6 : 1;
              d.cell.styles.textColor = [Math.round(rgb[0] * f), Math.round(rgb[1] * f), Math.round(rgb[2] * f)];
              d.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 12, W - M, H - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(`Central da Seção · ${opts.section}`, M, H - 7.5);
    doc.text(`${SYSTEM_NAME} · ${ORG_NAME}`, W / 2, H - 7.5, { align: 'center' });
    doc.text(`Página ${i} de ${n}`, W - M, H - 7.5, { align: 'right' });
  }
  doc.save(`${opts.filename}_${format(now, 'yyyy-MM-dd')}.pdf`);
}
