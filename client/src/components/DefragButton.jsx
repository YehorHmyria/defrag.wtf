import React, { useState } from 'react';
import axios from 'axios';
import { RefreshCw, Power } from 'lucide-react';

const DefragButton = ({ onDefragComplete, secret }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleDefrag = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(false);
    
    try {
      const defragSecret = secret || prompt("ENTER KEY:");
      if (!defragSecret) {
        setLoading(false);
        return;
      }

      await axios.get(`/api/defrag-now?secret=${defragSecret}`);
      
      setTimeout(() => {
        if (onDefragComplete) onDefragComplete();
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setError(true);
      setLoading(false);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <button 
      onClick={handleDefrag}
      disabled={loading}
      className={`
        fixed bottom-8 right-8 z-50
        w-14 h-14 rounded-full
        flex items-center justify-center
        border border-base-border
        bg-primary text-main
        hover:border-accent hover:text-accent hover:rotate-90
        focus:outline-none
        transition-all duration-300
        ${loading ? 'animate-spin border-accent text-accent' : ''}
        ${error ? 'border-hot text-hot hover:border-hot hover:text-hot' : ''}
      `}
      title="FORCE DEFRAG"
    >
      {loading ? (
        <RefreshCw size={24} />
      ) : (
        <Power size={24} />
      )}
    </button>
  );
};

export default DefragButton;
