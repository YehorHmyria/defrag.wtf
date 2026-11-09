const ImpactMeter = ({ score }) => {
  const hot = score >= 85;
  const on = Math.max(1, Math.round(score / 10));
  return (
    <div className="flex flex-col items-center gap-1 select-none" title={`Impact ${score}/100`}>
      <span className={`font-heading text-4xl leading-none ${hot ? 'text-hot' : 'text-accent'}`}>{score}</span>
      <div className="flex flex-col-reverse gap-[2px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`block h-[3px] w-6 ${i < on ? (hot ? 'bg-hot' : 'bg-accent') : 'bg-base-border'}`} />
        ))}
      </div>
      <span className="text-[9px] tracking-widest text-muted">IMPACT</span>
    </div>
  );
};

export default ImpactMeter;
