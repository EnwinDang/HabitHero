import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios-instance';

interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  status: 'success' | 'warning' | 'error';
}

const SystemLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Haal logs op via de admin.api route
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<LogEntry[]>('/admin/logs');
        setLogs(response.data || []);
      } catch (err: any) {
        console.error("Kon logs niet laden", err);
        setError(err.message || "Kon logs niet laden");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">System Audit Logs</h2>
        <button className="bg-violet-600 text-sm text-white px-4 py-2 rounded-lg hover:bg-violet-500">
          Clear Logs
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-8">Laden...</div>
      ) : logs.length === 0 ? (
        <div className="text-slate-400 text-center py-8">Geen logs beschikbaar</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-700">
            <thead className="text-xs uppercase bg-violet-50 text-slate-500">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-violet-50/60 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{log.user}</td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      log.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                      log.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;