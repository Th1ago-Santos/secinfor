import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notebook } from '@/types';

interface CautelaPrintProps {
  notebook: Notebook;
  onClose: () => void;
}

export default function CautelaPrint({ notebook, onClose }: CautelaPrintProps) {
  const baseUrl = window.location.origin;
  const dataEmissao = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const horaEmissao = format(new Date(), 'HH:mm');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* No-print controls */}
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

      {/* Print content */}
      <div className="max-w-[210mm] mx-auto p-[20mm] bg-white text-black min-h-screen" style={{ fontFamily: "'DM Sans', Arial, sans-serif" }}>
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold tracking-tight uppercase">Seção de Informática — 14° B Log</h1>
          <h2 className="text-lg font-semibold mt-1 uppercase">Cautela de Material de Informática</h2>
          <p className="text-xs mt-2 text-gray-600">Documento gerado em {dataEmissao} às {horaEmissao}</p>
        </div>

        {/* Item info */}
        <div className="flex gap-6 mb-8">
          <div className="flex-1">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 w-44 uppercase text-xs tracking-wider">Nº Patrimônio</td>
                  <td className="py-2.5 font-mono font-bold text-base">{notebook.patrimonio}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Modelo</td>
                  <td className="py-2.5">{notebook.modelo}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Seção</td>
                  <td className="py-2.5">{notebook.secao}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Militar Responsável</td>
                  <td className="py-2.5 font-semibold">{notebook.militar}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Status</td>
                  <td className="py-2.5">{notebook.status}</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-gray-700 uppercase text-xs tracking-wider">Data de Emissão</td>
                  <td className="py-2.5">{dataEmissao}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 border-2 border-gray-300 rounded-lg">
              <QRCodeSVG value={`${baseUrl}/consulta/${notebook.patrimonio}`} size={100} />
            </div>
            <p className="text-[9px] text-gray-500 mt-1.5 text-center">Consulta rápida</p>
          </div>
        </div>

        {/* Termo de responsabilidade */}
        <div className="mb-8 p-5 border border-gray-400 rounded-lg bg-gray-50">
          <h3 className="text-sm font-bold uppercase mb-3">Termo de Responsabilidade</h3>
          <p className="text-xs leading-relaxed text-gray-700">
            Declaro que recebi o material descrito acima em perfeito estado de funcionamento e conservação,
            comprometendo-me a zelar pela sua guarda e manutenção, responsabilizando-me por qualquer dano,
            extravio ou uso indevido que venha a ocorrer durante o período em que o mesmo estiver sob minha cautela.
            Comprometo-me a devolver o material nas mesmas condições em que o recebi, quando solicitado pela
            Seção de Informática.
          </p>
        </div>

        {/* Observações */}
        <div className="mb-12">
          <h3 className="text-sm font-bold uppercase mb-2">Observações</h3>
          <div className="border border-gray-300 rounded-lg p-4 min-h-[80px]">
            <div className="border-b border-dashed border-gray-300 mb-3 pb-3"></div>
            <div className="border-b border-dashed border-gray-300 mb-3 pb-3"></div>
            <div className="border-b border-dashed border-gray-300"></div>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between gap-12 mt-16">
          <div className="flex-1 text-center">
            <div className="border-t-2 border-black pt-2 mx-4">
              <p className="text-sm font-semibold">{notebook.militar}</p>
              <p className="text-xs text-gray-600">Militar Cautelado</p>
              <p className="text-xs text-gray-500 mt-0.5">Seção: {notebook.secao}</p>
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="border-t-2 border-black pt-2 mx-4">
              <p className="text-sm font-semibold">_________________________</p>
              <p className="text-xs text-gray-600">Responsável pela Cautela</p>
              <p className="text-xs text-gray-500 mt-0.5">Seção de Informática</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center">
          <p className="text-[9px] text-gray-500">Seção de Informática — 14° Batalhão Logístico — Documento de uso interno</p>
        </div>
      </div>
    </div>
  );
}
