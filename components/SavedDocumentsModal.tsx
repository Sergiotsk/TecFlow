import React, { useState, useEffect } from 'react';
import { SavedQuote, SavedReport, QuoteData, ReportData, DocType } from '../types';
import { getSavedQuotes, getSavedReports, deleteQuote, deleteReport, formatDateToDisplay } from '../utils/storage';

interface SavedDocumentsModalProps {
    mode: DocType;
    onLoad: (doc: QuoteData | ReportData) => void;
    onClose: () => void;
}

export const SavedDocumentsModal: React.FC<SavedDocumentsModalProps> = ({ mode, onLoad, onClose }) => {
    const [quotes, setQuotes] = useState<SavedQuote[]>([]);
    const [reports, setReports] = useState<SavedReport[]>([]);

    useEffect(() => {
        loadDocuments();
    }, [mode]);

    const loadDocuments = () => {
        setQuotes(getSavedQuotes());
        setReports(getSavedReports());
    };

    const handleDelete = (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;

        if (mode === 'quote') {
            deleteQuote(id);
        } else {
            deleteReport(id);
        }
        loadDocuments();
    };

    const handleLoad = (doc: SavedQuote | SavedReport) => {
        // Remove savedAt and lastModified before loading
        const { savedAt, lastModified, ...cleanDoc } = doc as any;
        onLoad(cleanDoc);
        onClose();
    };

    const formatTimestamp = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const documents = mode === 'quote' ? quotes : reports;
    const isQuote = mode === 'quote';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <i className={`fas ${isQuote ? 'fa-file-invoice-dollar' : 'fa-clipboard-check'}`}></i>
                                {isQuote ? 'Presupuestos Guardados' : 'Informes Guardados'}
                            </h2>
                            <p className="text-brand-100 text-sm mt-1">
                                {documents.length} documento{documents.length !== 1 ? 's' : ''} guardado{documents.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <i className={`fas ${isQuote ? 'fa-file-invoice' : 'fa-clipboard'} text-6xl text-gray-300 mb-4`}></i>
                            <p className="text-gray-500 text-lg">No hay {isQuote ? 'presupuestos' : 'informes'} guardados</p>
                            <p className="text-gray-400 text-sm mt-2">
                                Los documentos que guardes aparecerán aquí
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-lg text-gray-900">{doc.id}</h3>
                                                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium">
                                                    {formatDateToDisplay(doc.date)}
                                                </span>
                                            </div>

                                            <p className="text-gray-700 font-medium mb-1">
                                                <i className="fas fa-user text-brand-500 mr-2"></i>
                                                {doc.clientName || 'Sin nombre'}
                                            </p>

                                            {isQuote && (doc as SavedQuote).items && (
                                                <p className="text-gray-600 text-sm">
                                                    <i className="fas fa-list text-gray-400 mr-2"></i>
                                                    {(doc as SavedQuote).items.length} item{(doc as SavedQuote).items.length !== 1 ? 's' : ''}
                                                </p>
                                            )}

                                            {!isQuote && (doc as SavedReport).deviceType && (
                                                <p className="text-gray-600 text-sm">
                                                    <i className="fas fa-laptop text-gray-400 mr-2"></i>
                                                    {(doc as SavedReport).deviceType}
                                                </p>
                                            )}

                                            <div className="mt-3 flex gap-4 text-xs text-gray-500">
                                                <span>
                                                    <i className="fas fa-clock mr-1"></i>
                                                    Guardado: {formatTimestamp((doc as SavedQuote).savedAt)}
                                                </span>
                                                {(doc as SavedQuote).lastModified !== (doc as SavedQuote).savedAt && (
                                                    <span>
                                                        <i className="fas fa-edit mr-1"></i>
                                                        Modificado: {formatTimestamp((doc as SavedQuote).lastModified)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleLoad(doc)}
                                                className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                            >
                                                <i className="fas fa-folder-open"></i>
                                                Cargar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
