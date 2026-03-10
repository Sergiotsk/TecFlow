import React from 'react';
import { BusinessSettings, QuoteData, ReportData, PrinterReportData, DocType, LineItem } from '../types';
import { formatDateToDisplay } from '../utils/storage';

interface PrintableDocumentProps {
  mode: DocType;
  business: BusinessSettings;
  quoteData: QuoteData;
  reportData: ReportData;
  printerReportData?: PrinterReportData;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({ mode, business, quoteData, reportData, printerReportData }) => {
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
    <div id="actual-receipt" className="bg-white w-full mx-auto print:w-full print:max-w-none">

      {/* Real Footer Fixed (Print Only) */}
      <div className="print-footer-fixed hidden print:flex flex-col justify-center items-center bg-white border-t border-gray-200 w-full pb-2">
        <div className="text-center text-xs text-gray-500 mb-1 w-full px-8">
          <p className="whitespace-pre-wrap">{business.defaultFooter}</p>
          <p className="font-bold text-brand-700">{business.finalMessage}</p>
        </div>
        <div className="page-number text-[10px] text-gray-400"></div>
      </div>

      <table className="w-full">
        {/* REPEATED HEADER */}
        <thead className="print-head">
          <tr>
            <td>
              <header className="flex justify-between items-start border-b-2 border-brand-500 py-6 mb-8 px-10">
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
                    {mode === 'quote' ? 'Presupuesto' : (mode === 'printer-report' ? 'REPORTE DE IMPRESIÓN' : 'Informe Técnico')}
                  </h2>

                  <div className="mt-2 text-gray-600">
                    <p><strong>Nº:</strong> {mode === 'quote' ? quoteData.id : (mode === 'printer-report' ? printerReportData?.id : reportData.id)}</p>
                    <p><strong>Fecha:</strong> {formatDateToDisplay(mode === 'quote' ? quoteData.date : (mode === 'printer-report' ? printerReportData!.date : reportData.date))}</p>
                    {mode === 'quote' && <p className="text-xs text-red-500 mt-1">Válido hasta: {formatDateToDisplay(quoteData.validUntil)}</p>}
                  </div>
                </div>

              </header>
            </td>
          </tr>
        </thead>

        {/* BODY CONTENT */}
        <tbody className="print-body">
          <tr>
            <td>
              <div className="p-6 md:p-8 print:px-10 print:py-0">
                {/* Client Info Section */}
                <section className="mb-6">
                  <div className="border-b border-gray-200 pb-3">
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                      <div>
                        <span className="text-xs font-bold uppercase text-gray-500 mr-2">Cliente:</span>
                        <span className="font-semibold text-lg">{mode === 'quote' ? quoteData.clientName : (mode === 'printer-report' ? printerReportData?.clientName : reportData.clientName)}</span>
                      </div>
                      {mode === 'quote' && (
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
                    {!isQuote && (
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-wrap items-center gap-x-8 gap-y-2">
                        <div>
                          <span className="text-xs font-bold uppercase text-gray-500 mr-2">Equipo:</span>
                          <span className="font-medium">{(mode === 'printer-report' && printerReportData?.printerModel) ? printerReportData.printerModel : reportData.deviceType}</span>
                        </div>
                        {((mode === 'printer-report' && printerReportData?.serialNumber) || reportData.serialNumber) && (
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-500 mr-2">S/N:</span>
                            <span className="font-medium">{mode === 'printer-report' ? printerReportData?.serialNumber : reportData.serialNumber}</span>
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
                  </div>
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
                  ) : mode === 'report' ? (
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
                    </div>
                  ) : (
                    // PRINTER REPORT CONTENT
                    printerReportData && (
                      <div className="printer-report-container pt-2">
                        {/* 1. TEST DE INYECTORES */}
                        <div className="mb-6 break-inside-avoid">
                          <h3 className="text-gray-900 font-bold uppercase text-sm border-b-2 border-gray-100 mb-4 pb-1">1. TEST DE INYECTORES</h3>
                          <div className="grid grid-cols-5 gap-x-4 px-2">
                            {/* Cyan Square */}
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 border border-gray-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#006192' }}>
                                <div className="absolute inset-x-0 top-0 bg-white opacity-95 transition-all duration-1000" style={{ height: `${100 - printerReportData.cyanCoverage}%` }}></div>
                              </div>
                              <div className="mt-1 text-center">
                                <span className="block text-[9px] font-medium text-gray-500 uppercase">Cyan</span>
                                <span className="text-[10px] font-bold text-gray-900">{printerReportData.cyanCoverage}%</span>
                              </div>
                            </div>
                            {/* Magenta Square */}
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 border border-gray-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#FF00FF' }}>
                                <div className="absolute inset-x-0 top-0 bg-white opacity-95 transition-all duration-1000" style={{ height: `${100 - printerReportData.magentaCoverage}%` }}></div>
                              </div>
                              <div className="mt-1 text-center">
                                <span className="block text-[9px] font-medium text-gray-500 uppercase">Mag</span>
                                <span className="text-[10px] font-bold text-gray-900">{printerReportData.magentaCoverage}%</span>
                              </div>
                            </div>
                            {/* Yellow Square */}
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 border border-gray-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#FFEF00' }}>
                                <div className="absolute inset-x-0 top-0 bg-white opacity-95 transition-all duration-1000" style={{ height: `${100 - printerReportData.yellowCoverage}%` }}></div>
                              </div>
                              <div className="mt-1 text-center">
                                <span className="block text-[9px] font-medium text-gray-500 uppercase">Yel</span>
                                <span className="text-[10px] font-bold text-gray-900">{printerReportData.yellowCoverage}%</span>
                              </div>
                            </div>
                            {/* Black Square */}
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 border border-gray-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
                                <div className="absolute inset-x-0 top-0 bg-white opacity-95 transition-all duration-1000" style={{ height: `${100 - printerReportData.blackCoverage}%` }}></div>
                              </div>
                              <div className="mt-1 text-center">
                                <span className="block text-[9px] font-medium text-gray-500 uppercase">Blk</span>
                                <span className="text-[10px] font-bold text-gray-900">{printerReportData.blackCoverage}%</span>
                              </div>
                            </div>
                            {/* Gray Square */}
                            <div className="flex flex-col items-center">
                              <div className="w-14 h-14 border border-gray-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#777777' }}>
                                <div className="absolute inset-x-0 top-0 bg-white opacity-95 transition-all duration-1000" style={{ height: `${100 - printerReportData.grayPattern}%` }}></div>
                              </div>
                              <div className="mt-1 text-center">
                                <span className="block text-[9px] font-medium text-gray-500 uppercase">Gris</span>
                                <span className="text-[10px] font-bold text-gray-900">{printerReportData.grayPattern}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. PATRÓN DE CALIDAD Y ESCALA DE GRISES */}
                        <div className="mb-6 break-inside-avoid">
                          <h3 className="text-gray-900 font-bold uppercase text-sm border-b-2 border-gray-100 mb-4 pb-1">2. ESCALA DE GRISES Y CALIDAD</h3>

                          <div className="px-6 mb-4">
                            <p className="text-center text-[9px] text-gray-400 font-bold uppercase mb-1">Escala 0-100%</p>
                            <div className="flex border border-gray-300">
                              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                                <div key={val} className="flex-1 text-center">
                                  <div
                                    className="h-6 border-r border-gray-300 last:border-0"
                                    style={{ backgroundColor: `rgba(0,0,0,${val / 100})` }}
                                  ></div>
                                  <div className="text-[9px] py-0.5 border-t border-gray-300">{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="px-6 space-y-1">
                            <div className="h-6 border border-gray-200 rounded-sm overflow-hidden" style={{ background: 'linear-gradient(to right, white, #00b0f0)' }}></div>
                            <div className="h-6 border border-gray-200 rounded-sm overflow-hidden" style={{ background: 'linear-gradient(to right, white, #FF00FF)' }}></div>
                            <div className="h-6 border border-gray-200 rounded-sm overflow-hidden" style={{ background: 'linear-gradient(to right, white, #ffff00)' }}></div>
                            <div className="h-6 border border-gray-200 rounded-sm overflow-hidden" style={{ background: 'linear-gradient(to right, white, #000000)' }}></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 px-2 mb-6">
                          <div className="break-inside-avoid">
                            <h3 className="text-gray-900 font-bold uppercase text-sm border-b border-gray-100 mb-3 pb-1">3. TEST DE ALINEACIÓN</h3>
                            <div className="flex justify-center items-center opacity-40 space-x-8 py-2">
                              {/* SVG/CSS Alignment Grids */}
                              <div className="relative w-20 h-20 border border-gray-400">
                                {[...Array(9)].map((_, i) => <div key={i} className="absolute inset-x-0 border-b border-gray-400" style={{ top: `${i * 12.5}%`, height: '0' }}></div>)}
                                {[...Array(9)].map((_, i) => <div key={i} className="absolute inset-y-0 border-r border-gray-400" style={{ left: `${i * 12.5}%`, width: '0' }}></div>)}
                              </div>
                              <div className="relative w-20 h-20 border border-gray-400">
                                {[...Array(9)].map((_, i) => <div key={i} className="absolute inset-x-0 border-b border-gray-400" style={{ top: `${i * 12.5}%`, height: '0' }}></div>)}
                                {[...Array(9)].map((_, i) => <div key={i} className="absolute inset-y-0 border-r border-gray-400" style={{ left: `${i * 12.5}%`, width: '0' }}></div>)}
                              </div>
                            </div>
                          </div>

                          <div className="break-inside-avoid">
                            <h3 className="text-gray-900 font-bold uppercase text-sm border-b border-gray-100 mb-3 pb-1">4. MEZCLA DE COLOR</h3>
                            <div className="grid grid-cols-3 gap-2 px-1">
                              {/* Orange (M+Y) */}
                              <div className="flex flex-col items-center">
                                <div className="w-full aspect-square border border-gray-100 shadow-sm" style={{ backgroundColor: '#f37021' }}></div>
                                <p className="text-[9px] font-bold text-gray-400 mt-1">M+Y</p>
                              </div>
                              {/* Green (C+Y) */}
                              <div className="flex flex-col items-center">
                                <div className="w-full aspect-square border border-gray-100 shadow-sm" style={{ backgroundColor: '#00a651' }}></div>
                                <p className="text-[9px] font-bold text-gray-400 mt-1">C+Y</p>
                              </div>
                              {/* Purple (C+M) */}
                              <div className="flex flex-col items-center">
                                <div className="w-full aspect-square border border-gray-100 shadow-sm" style={{ backgroundColor: '#662d91' }}></div>
                                <p className="text-[9px] font-bold text-gray-400 mt-1">C+M</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TECHNICAL NOTES & FINAL ADVICE */}
                        <div className="break-inside-avoid border-t border-brand-200 pt-2">
                          <h3 className="text-gray-900 font-bold uppercase text-[10px] mb-2">Observaciones Técnicas</h3>
                          <div className="bg-gray-50 p-2 border border-gray-200 rounded min-h-[60px]">
                            <p className="text-gray-700 whitespace-pre-wrap leading-tight text-xs italic">
                              {printerReportData.technicianNotes || 'Sin observaciones adicionales.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Scope of Work (Quote Only) */}
                  {isQuote && quoteData.scopeOfWork && (
                    <div className="mt-6 mb-4 break-inside-avoid">
                      <h3 className="text-sm font-bold text-brand-600 uppercase border-b border-brand-200 mb-2 pb-1">Alcance del Trabajo / Tareas</h3>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{quoteData.scopeOfWork}</p>
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
              </div>
            </td>
          </tr>
        </tbody>

        {/* FOOTER SPACER (Print Oly) */}
        <tfoot className="print-foot">
          <tr>
            <td className="h-[50px]">{/* Spacer for fixed footer */}</td>
          </tr>
        </tfoot>
      </table>

      {/* On Screen Footer (Non-Print) */}
      <footer className="print:hidden mt-auto pt-4 text-center text-xs text-gray-500 border-t border-gray-200 px-8 pb-8">
        <p className="mb-1 whitespace-pre-wrap">{business.defaultFooter}</p>
        <p className="font-bold text-brand-700">{business.finalMessage}</p>
      </footer>
    </div >
  );
};
