import React from 'react';
import { ExternalLink, Calendar, Server } from 'lucide-react';
import ImpactBar from './ImpactBar';

const ArticleCard = ({ article, isHero = false }) => {
  const { title, summary, short_tag, impact_score, source_name, published_at, original_url } = article;
  
  // Format date
  const date = new Date(published_at).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  // Tag colors
  const getTagColor = (tag) => {
    const t = tag.toUpperCase();
    if (['FAIL', 'CRASH', 'HACKED', 'LEAK'].includes(t)) return 'bg-red-600 text-white';
    if (['AI', 'LAUNCH', 'UPDATE'].includes(t)) return 'bg-electric-blue text-black';
    if (['HYPE', 'VAPORWARE', 'CRYPTO'].includes(t)) return 'bg-hot-pink text-black';
    return 'bg-neon-lime text-black';
  };

  // Parse summary bullet points based on newlines or bullet chars
  const bullets = summary.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^[•\-\*]\s*/, ''));

  return (
    <article className={`card-neo flex flex-col h-full group relative ${isHero ? 'md:col-span-2 lg:col-span-3 min-h-[400px]' : ''}`}>
      {/* Absolute positioning flair */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-0">
        <ExternalLink size={24} className="text-white" />
      </div>

      {/* Header Metadata */}
      <div className="flex justify-between items-start mb-4 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
          <Server size={12} />
          <span className="uppercase">{source_name}</span>
          <span className="text-neutral-700">//</span>
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{date}</span>
          </div>
        </div>
        
        <span className={`badge-neo ${getTagColor(short_tag)}`}>
          {short_tag}
        </span>
      </div>

      {/* Title */}
      <h3 className={`font-heading font-bold leading-none mb-4 group-hover:text-neon-lime transition-colors duration-0 ${isHero ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-2xl'}`}>
        <a href={original_url} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
          {title}
        </a>
      </h3>

      {/* Impact Score */}
      <ImpactBar score={impact_score} />

      {/* Content */}
      <div className="mt-auto pt-4 border-t border-neutral-800 border-dashed">
        <ul className={`font-mono text-neutral-300 space-y-2 ${isHero ? 'text-lg' : 'text-sm'}`}>
          {bullets.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-neon-lime font-bold">{'>'}</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Hover decoration corner */}
      <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-transparent border-b-[20px] border-r-[20px] group-hover:border-b-white group-hover:border-r-white transition-all duration-0"></div>
    </article>
  );
};

export default ArticleCard;
