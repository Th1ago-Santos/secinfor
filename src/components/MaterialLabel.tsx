import { QRCodeSVG } from 'qrcode.react';
import { Notebook } from '@/types';

interface MaterialLabelProps {
  notebook: Notebook;
  onClose: () => void;
}

export default function MaterialLabel({ notebook, onClose }: MaterialLabelProps) {
  const baseUrl = window.location.origin;
  const patrimonioDisplay = notebook.patrimonio.startsWith('FC-') ? 'FORA DE CARGA' : notebook.patrimonio;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:opacity-90 transition-all"
        >
          Imprimir
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium shadow-lg hover:bg-muted/80 transition-all"
        >
          Fechar
        </button>
      </div>

      <div className="flex items-center justify-center min-h-screen">
        <div
          className="bg-white text-black border-2 border-black rounded-lg p-4"
          style={{
            width: '90mm',
            minHeight: '55mm',
            fontFamily: "'DM Sans', Arial, sans-serif",
          }}
        >
          {/* Header */}
          <div className="text-center border-b border-black pb-1.5 mb-2">
            <p className="text-[8px] font-bold uppercase tracking-wider">Sç Informática — 14° B Log</p>
          </div>

          <div className="flex gap-3">
            {/* Info */}
            <div className="flex-1 space-y-1">
              <div>
                <p className="text-[7px] uppercase text-gray-500 font-semibold tracking-wider">Patrimônio</p>
                <p className="text-sm font-bold font-mono leading-tight">{patrimonioDisplay}</p>
              </div>
              <div>
                <p className="text-[7px] uppercase text-gray-500 font-semibold tracking-wider">Modelo</p>
                <p className="text-[10px] font-semibold leading-tight">{notebook.modelo}</p>
              </div>
              <div>
                <p className="text-[7px] uppercase text-gray-500 font-semibold tracking-wider">Seção</p>
                <p className="text-[10px] leading-tight">{notebook.secao}</p>
              </div>
              {notebook.militar && (
                <div>
                  <p className="text-[7px] uppercase text-gray-500 font-semibold tracking-wider">Responsável</p>
                  <p className="text-[10px] leading-tight">{notebook.militar}</p>
                </div>
              )}
              <div>
                <p className="text-[7px] uppercase text-gray-500 font-semibold tracking-wider">Status</p>
                <p className="text-[9px] font-medium leading-tight">{notebook.status}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="border border-gray-300 rounded p-1.5">
                <QRCodeSVG value={`${baseUrl}/consulta/${notebook.patrimonio}`} size={70} />
              </div>
              <p className="text-[6px] text-gray-400 mt-0.5 text-center">Consulta rápida</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
