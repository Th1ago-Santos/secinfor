import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

type PDFReportOptions = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
  filename: string;
  orientation?: 'portrait' | 'landscape';
};

export function generatePDFReport({ title, subtitle, columns, rows, filename, orientation = 'portrait' }: PDFReportOptions) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Data: ${format(new Date(), 'dd/MM/yyyy')} — Hora: ${format(new Date(), 'HH:mm:ss')}`,
    pageWidth / 2, 27, { align: 'center' }
  );

  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, subtitle ? 35 : 30, pageWidth - 14, subtitle ? 35 : 30);

  // Table
  autoTable(doc, {
    startY: subtitle ? 38 : 33,
    head: [columns],
    body: rows,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [229, 231, 235],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${rows.length} registro(s)`, 14, pageHeight - 10);
    doc.text('Sistema de Controle de Patrimônio', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }

  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
