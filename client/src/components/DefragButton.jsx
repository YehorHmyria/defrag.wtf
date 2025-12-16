import React, { useState } from 'react';
import axios from 'axios';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const DefragButton = ({ onDefragComplete, secret }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDefrag = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In production you would use the secret from ENV variable or prompt user
      const defragSecret = secret || prompt("ENTER SYSTEM SECRET:");
      if (!defragSecret) {
        setLoading(false);
        return;
      }

      await axios.get(`/api/defrag-now?secret=${defragSecret}`);
      
      // Since the backend processes async, we wait a bit then notify parent to refresh
      setTimeout(() => {
        if (onDefragComplete) onDefragComplete();
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setError('ACCESS DENIED');
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {error && (
        <div className="absolute bottom-full right-0 mb-2 bg-red-600 text-white p-2 font-mono text-xs font-bold border-2 border-white animate-pulse">
          ERROR: {error}
        </div>
      )}
      
      <button 
        onClick={handleDefrag}
        disabled={loading}
        className={`
          flex items-center gap-2 
          bg-red-600 text-black 
          border-4 border-black 
          px-6 py-4 
          font-heading font-bold text-xl 
          uppercase tracking-tighter
          hover:bg-white hover:border-red-600 hover:text-red-600
          transition-none duration-0
          shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
          hover:translate-x-[2px] hover:translate-y-[2px]
          hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
          active:translate-x-[8px] active:translate-y-[8px]
          active:shadow-none
        `}
      >
        {loading ? (
          <>
            <RefreshCw className="animate-spin" size={24} />
            <span className="animate-pulse">PROCESSING...</span>
          </>
        ) : (
          <>
            <AlertTriangle size={24} />
            FORCE DEFRAG
          </>
        )}
      </button>
    </div>
  );
};

export default DefragButton;
