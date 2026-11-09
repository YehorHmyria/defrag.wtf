const COLOR = { high: 'text-accent border-accent/60', medium: 'text-accent-secondary border-accent-secondary/60', low: 'text-hot border-hot/60' };

const CredibilityBadge = ({ credibility }) => {
  if (!credibility) return null;
  const { score, level, factors } = credibility;
  const tip = `${factors.sources} source(s), avg trust ${factors.avg_trust}${factors.primary_source ? ', primary source' : ''}`;
  return (
    <span className={`chip ${COLOR[level]}`} title={`Credibility: ${tip}`}>
      CRED {score} · {level.toUpperCase()}
    </span>
  );
};

export default CredibilityBadge;
