import React from 'react';

const ImpactBar = ({ score }) => {
  // Determine color based on score
  let barColor = 'bg-electric-blue';
  if (score >= 70) barColor = 'bg-neon-lime';
  else if (score >= 40) barColor = 'bg-hot-pink';
  
  // Calculate blocks (10 blocks total)
  const totalBlocks = 10;
  const filledBlocks = Math.round((score / 100) * totalBlocks);
  
  return (
    <div className="flex items-center gap-2 font-mono text-xs my-3">
      <span className="text-neutral-500">IMPACT:</span>
      <div className="flex gap-0.5">
        {[...Array(totalBlocks)].map((_, i) => (
          <div 
            key={i} 
            className={`w-3 h-4 ${i < filledBlocks ? barColor : 'bg-neutral-800'}`}
          ></div>
        ))}
      </div>
      <span className={`font-bold ml-1 ${barColor.replace('bg-', 'text-')}`}>
        [{score}%]
      </span>
    </div>
  );
};

export default ImpactBar;
