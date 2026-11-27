'use client';

import { useState, useEffect } from 'react';
import { adminService, NOT_ADMIN_MESSAGE, YesterdayReport } from '@/services/adminService';

// Only remembers that X was opened from this browser, not that the post was sent.
const openedKey = (day: string) => `x-opened-${day}`;

// Storage can be blocked by the browser: the card works without the notice.
const wasOpened = (day: string) => {
  try {
    return localStorage.getItem(openedKey(day)) !== null;
  } catch {
    return false;
  }
};

const rememberOpened = (day: string) => {
  try {
    localStorage.setItem(openedKey(day), '1');
  } catch {
    // Nothing to do without storage.
  }
};

export default function XReportCard() {
  const [report, setReport] = useState<YesterdayReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const load = () =>
      adminService
        .getYesterdayReport()
        .then((data) => {
          setReport(data);
          setOpened(wasOpened(data.day));
          setError(null);
        })
        .catch((err) =>
          setError(
            err instanceof Error && err.message === NOT_ADMIN_MESSAGE
              ? NOT_ADMIN_MESSAGE
              : 'No se pudo cargar el reporte de ayer.'
          )
        );

    load();
    // A tab left open overnight must not post the previous day's count.
    const reloadWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', reloadWhenVisible);
    return () => document.removeEventListener('visibilitychange', reloadWhenVisible);
  }, []);

  const handlePost = (day: string) => {
    rememberOpened(day);
    setOpened(true);
  };

  const renderBody = () => {
    if (error) return <p className="text-red-500">{error}</p>;
    if (!report) return <p>Cargando...</p>;
    if (!report.text) return <p className="text-gray-500">No hubo baches nuevos ayer.</p>;

    return (
      <div className="space-y-3">
        <p className="text-gray-700 whitespace-pre-line break-words">{report.text}</p>
        {!report.hasMention && (
          <p className="text-sm text-yellow-700">
            Falta configurar la cuenta del gobierno: el texto saldrá sin mención.
          </p>
        )}
        {opened && <p className="text-sm text-gray-500">Ya abriste X para este reporte.</p>}
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(report.text)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handlePost(report.day)}
          className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          Publicar en X
        </a>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-lg shadow p-4 mb-8 max-w-xl">
      <h2 className="text-xl font-bold mb-3 text-gray-900">Reporte de ayer</h2>
      {renderBody()}
    </section>
  );
}
