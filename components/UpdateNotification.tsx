import React, { useEffect, useState } from 'react';

const UpdateNotification: React.FC = () => {
    const [status, setStatus] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [downloaded, setDownloaded] = useState(false);
    const [info, setInfo] = useState<any>(null);

    useEffect(() => {
        if (!window.electronAPI) return;

        // Listeners
        window.electronAPI.onUpdateStatus((s: string) => {
            if (s === 'checking') setStatus('Buscando actualizaciones...');
            else if (s === 'uptodate') {
                // Optionally show a momentary toast
                console.log('App is up to date');
            }
        });

        window.electronAPI.onUpdateAvailable((i: any) => {
            setInfo(i);
            setStatus('Nueva versión disponible. Descargando...');
        });

        window.electronAPI.onUpdateProgress((p: any) => {
            setProgress(p.percent);
        });

        window.electronAPI.onUpdateDownloaded((i: any) => {
            setDownloaded(true);
            setInfo(i);
            setStatus('Descarga completada.');
        });

        window.electronAPI.onUpdateError((e: string) => {
            console.error("Update error:", e);
            // setStatus(`Error: ${e}`); // Maybe don't show to user unless critical
        });

        // Trigger check on mount
        window.electronAPI.checkUpdates();

    }, []);

    if (!status && !downloaded) return null;

    if (downloaded) {
        return (
            <div className="fixed bottom-4 right-4 bg-brand-600 text-white p-4 rounded-lg shadow-xl z-50 animate-fade-in max-w-sm">
                <div className="flex items-start gap-3">
                    <i className="fas fa-gift text-2xl mt-1"></i>
                    <div>
                        <h4 className="font-bold">¡Nueva versión lista!</h4>
                        <p className="text-sm opacity-90 mb-2">Versión {info?.version} descargada.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.electronAPI?.restartAndInstall()}
                                className="bg-white text-brand-600 font-bold px-3 py-1.5 rounded text-xs hover:bg-gray-100 transition shadow-sm"
                            >
                                Reiniciar y Actualizar
                            </button>
                            <button
                                onClick={() => setDownloaded(false)}
                                className="text-white text-xs hover:underline translate-y-1"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status) {
        // Downloading state or Checking
        // We only show if it's actually downloading to avoid annoying "checking" toasts every time
        if (status.includes('Buscando')) return null;

        return (
            <div className="fixed bottom-4 right-4 bg-white border border-brand-200 text-gray-800 p-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
                <div className="relative">
                    <i className="fas fa-cloud-download-alt text-brand-500 text-xl"></i>
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-700">{status}</p>
                    {progress > 0 && progress < 100 && (
                        <div className="w-40 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default UpdateNotification;
