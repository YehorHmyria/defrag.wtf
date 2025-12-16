import React from 'react';

const ImpactBar = ({ score }) => {
  const dots = 5;
  // Calculate active dots (1-5)
  const activeDots = Math.max(1, Math.ceil(score / 20));
  
  // Determine color scheme
  const isHighImpact = score >= 80;
  const dotColor = isHighImpact ? 'bg-hot' : 'bg-accent';
  const textColor = isHighImpact ? 'text-hot' : 'text-accent';

  return (
    <div className="flex items-center gap-3 mt-4 font-mono text-xs select-none">
      {/* Visual Dots */}
      <div className="flex gap-1.5">
        {[...Array(dots)].map((_, i) => (
          <div 
            key={i} 
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${i < activeDots ? dotColor : 'bg-base-border'}
            `}
          />
        ))}
      </div>
      

    </div>
  );
};

export default ImpactBar;
