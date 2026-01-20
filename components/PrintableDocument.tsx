import React from 'react';
import { BusinessSettings, QuoteData, ReportData, DocType, LineItem } from '../types';
import { formatDateToDisplay } from '../utils/storage';

interface PrintableDocumentProps {
  mode: DocType;
  business: BusinessSettings;
  quoteData: QuoteData;
  reportData: ReportData;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({ mode, business, quoteData, reportData }) => {
  const isQuote = mode === 'quote';

  // Calculate Totals for Quote
  const subtotal = quoteData.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const taxAmount = (subtotal * quoteData.taxRate) / 100;
  const total = subtotal + taxAmount;

  // Split Items
  const services = quoteData.items.filter(i => i.type === 'service' || !i.type); // Default to service if undefined
  const materials = quoteData.items.filter(i => i.type === 'material');

  const renderTable = (title: string, items: LineItem[]) => {
    // Calculate subtotal for this section
    const sectionSubtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    return (
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-1.5 border-b border-gray-300 pb-0.5">{title}</h3>
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-gray-300 text-xs text-gray-600">
              <th className="py-1 font-semibold w-[10%] text-center">Cant.</th>
              <th className="py-1 font-semibold w-[60%]">Descripción</th>
              <th className="py-1 font-semibold w-[15%] text-right">Precio Unit.</th>
              <th className="py-1 font-semibold w-[15%] text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-1.5 text-center align-top text-xs">{item.quantity}</td>
                <td className="py-1.5 align-top text-xs whitespace-pre-wrap break-words pr-2">{item.description}</td>
                <td className="py-1.5 text-right align-top text-xs">
                  {item.unitPrice.toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}
                </td>
                <td className="py-1.5 text-right font-medium align-top text-xs">
                  {(item.quantity * item.unitPrice).toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}
                </td>
              </tr>
            ))}
            {/* Subtotal Row */}
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={3} className="py-1.5 text-right font-bold text-xs text-gray-700 pr-4">
                Subtotal {title}:
              </td>
              <td className="py-1.5 text-right font-bold text-sm text-gray-900">
                {sectionSubtotal.toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="actual-receipt" className="bg-white w-full shadow-lg print:shadow-none p-6 md:p-8 print:p-0 relative flex flex-col text-sm text-gray-800 box-border mx-auto max-w-[210mm] min-h-[297mm] print:min-h-[95vh] print:aspect-auto print:max-w-none print:w-full print:h-auto">
      {/* Header */}
      <header className="flex justify-between items-start border-b-2 border-brand-500 pb-4 mb-4">
        <div className="flex items-center space-x-4">
          {business.logo && (
            <img src={business.logo} alt="Logo" className="h-20 w-auto object-contain max-w-[150px]" />
          )}
          {!business.logo && (
            <div className="h-20 w-20 bg-brand-100 flex items-center justify-center rounded text-brand-500">
              <i className="fas fa-bolt text-3xl"></i>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <div className="text-gray-500 text-xs mt-1 space-y-0.5">
              {business.address && <p><i className="fas fa-map-marker-alt w-4"></i> {business.address}</p>}
              {business.phone && <p><i className="fas fa-phone w-4"></i> {business.phone}</p>}
              {business.email && <p><i className="fas fa-envelope w-4"></i> {business.email}</p>}
              {business.website && <p><i className="fas fa-globe w-4"></i> {business.website}</p>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-brand-600 uppercase tracking-wide">
            {isQuote ? 'Presupuesto' : 'Informe Técnico'}
          </h2>
          <div className="mt-2 text-gray-600">
            <p><strong>Nº:</strong> {isQuote ? quoteData.id : reportData.id}</p>
            <p><strong>Fecha:</strong> {formatDateToDisplay(isQuote ? quoteData.date : reportData.date)}</p>
            {isQuote && <p className="text-xs text-red-500 mt-1">Válido hasta: {formatDateToDisplay(quoteData.validUntil)}</p>}
          </div>
        </div>
      </header>

      {/* Client Info Section - Horizontal Layout */}
      <section className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          {/* Client Name */}
          <div>
            <span className="text-xs font-bold uppercase text-gray-500 mr-2">Cliente:</span>
            <span className="font-semibold text-lg">{isQuote ? quoteData.clientName : reportData.clientName}</span>
          </div>

          {/* Quote Specifics - Address & ID */}
          {isQuote && (
            <>
              {quoteData.clientAddress && (
                <div>
                  <span className="text-xs font-bold uppercase text-gray-500 mr-2">Dirección:</span>
                  <span className="text-gray-700">{quoteData.clientAddress}</span>
                </div>
              )}
              {quoteData.clientId && (
                <div>
                  <span className="text-xs font-bold uppercase text-gray-500 mr-2">ID/CUIT:</span>
                  <span className="text-gray-700">{quoteData.clientId}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Report Specifics - Equipment Details */}
        {!isQuote && (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <span className="text-xs font-bold uppercase text-gray-500 mr-2">Equipo:</span>
              <span className="font-medium">{reportData.deviceType}</span>
            </div>
            {reportData.serialNumber && (
              <div>
                <span className="text-xs font-bold uppercase text-gray-500 mr-2">S/N:</span>
                <span className="font-medium">{reportData.serialNumber}</span>
              </div>
            )}
            <div className="ml-auto">
              <span className="text-xs font-bold uppercase text-gray-500 mr-2">Estado:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white 
                  ${reportData.status === 'Reparado' ? 'bg-green-500' :
                  reportData.status === 'Sin Solución' ? 'bg-red-500' :
                    reportData.status === 'Pendiente de Repuesto' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                {reportData.status}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Content Body */}
      <div className="flex-grow">
        {isQuote ? (
          <div>
            {/* SERVICES TABLE */}
            {services.length > 0 && renderTable("Servicios / Mano de Obra", services)}

            {/* MATERIALS TABLE */}
            {materials.length > 0 && renderTable(quoteData.materialsSectionTitle || "Materiales / Repuestos", materials)}

            {services.length === 0 && materials.length === 0 && (
              <p className="text-gray-400 italic text-center py-8">Sin items cotizados.</p>
            )}

            {/* TOTALS */}
            <div className="flex justify-end mt-3 break-inside-avoid">
              <div className="w-1/2 md:w-1/3">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 font-medium text-xs">Subtotal:</span>
                  <span className="font-medium text-sm">{subtotal.toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}</span>
                </div>
                {quoteData.taxRate > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">IVA ({quoteData.taxRate}%):</span>
                    <span className="text-sm">{taxAmount.toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-gray-900 mt-1">
                  <span className="text-gray-900 font-bold text-base">TOTAL:</span>
                  <span className="text-gray-900 font-bold text-base">{total.toLocaleString('es-AR', { style: 'currency', currency: quoteData.currency })}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // REPORT CONTENT
          <div className="space-y-6">
            <div className="break-inside-avoid">
              <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Problema Reportado</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reportData.reportedIssue || 'N/A'}</p>
            </div>
            <div className="break-inside-avoid">
              <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Diagnóstico Técnico</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reportData.diagnosis || 'Pendiente de diagnóstico.'}</p>
            </div>
            <div className="break-inside-avoid">
              <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Trabajo Realizado / Materiales</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reportData.workPerformed || 'N/A'}</p>
            </div>
            <div className="break-inside-avoid">
              <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Recomendaciones</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{reportData.recommendations || 'Sin recomendaciones adicionales.'}</p>
            </div>
            {reportData.notes && (
              <div className="break-inside-avoid">
                <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Observaciones</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{reportData.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes (Quote Only) */}
        {isQuote && quoteData.notes && (
          <div className="mt-4 pt-3 border-t border-dashed border-gray-300 break-inside-avoid">
            <h4 className="font-bold text-xs text-gray-500 uppercase mb-1.5">Notas / Condiciones:</h4>
            <p className="text-gray-600 text-xs whitespace-pre-wrap leading-relaxed">{quoteData.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-4 text-center text-xs text-gray-500 border-t border-gray-200 break-inside-avoid">
        <p className="mb-1 whitespace-pre-wrap">{business.defaultFooter}</p>
        <p className="font-bold text-brand-700">{business.finalMessage}</p>
      </footer>
    </div>
  );
};