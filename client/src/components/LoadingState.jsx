import React from 'react';

const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] font-mono text-neon-lime">
      <div className="w-full max-w-md p-6 border-2 border-dashed border-neutral-700 bg-black/50">
        <div className="mb-4 text-xs text-neutral-500 border-b border-neutral-800 pb-2">
          SYSTEM_BOOT_SEQUENCE.EXE
        </div>
        <div className="space-y-1 text-sm">
          <div className="animate-pulse delay-75">{`> INITIALIZING CONNECTION... [OK]`}</div>
          <div className="opacity-0 animate-[fadeIn_0.5s_ease-in_forwards_0.5s]">{`> ESTABLISHING SECURE HANDSHAKE... [OK]`}</div>
          <div className="opacity-0 animate-[fadeIn_0.5s_ease-in_forwards_1s] text-hot-pink">{`> DEFRAGMENTING REALITY...`}</div>
          <div className="opacity-0 animate-[fadeIn_0.5s_ease-in_forwards_1.5s]">{`> FETCHING RAW DATA...`}</div>
          <div className="opacity-0 animate-[fadeIn_0.5s_ease-in_forwards_2s] mt-4 flex">
            <span>{`> AWAITING INPUT`}</span>
            <span className="animate-blink inline-block w-2 H-4 bg-neon-lime ml-1"></span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-8 h-2 w-full bg-neutral-900 border border-neutral-700">
          <div className="h-full bg-neon-lime animate-[width_2.5s_ease-in-out_forwards] w-0"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
