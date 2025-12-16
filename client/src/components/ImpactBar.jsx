import React from 'react';

const ImpactBar = ({ score }) => {
  // Determine color based on score
  let barColor = 'bg-neon-cyan';
  if (score >= 80) barColor = 'bg-hot-pink';
  
  return (
    <div className="w-full mt-4 group bg-neutral-900 h-[2px] overflow-hidden">
      <div 
        className={`h-full ${barColor} transition-all duration-500`} 
        style={{ width: `${score}%` }}
      ></div>
    </div>
  );
};

export default ImpactBar;
