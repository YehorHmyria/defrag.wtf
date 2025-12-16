import React from 'react';
import { ExternalLink } from 'lucide-react';
import ImpactBar from './ImpactBar';

const ArticleCard = ({ article, isHero = false, onSave, isSaved, onTagClick }) => {
  const { title, summary, short_tag, impact_score, source_name, published_at, original_url } = article;
  
  const date = new Date(published_at).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });

  const getTagColor = (tag) => {
    if (!tag) return 'text-bright-yellow';
    const t = tag.toUpperCase();
    if (['FAIL', 'CRASH', 'HACKED', 'LEAK'].includes(t)) return 'text-hot-pink';
    if (['AI', 'LAUNCH', 'UPDATE', 'RELEASE', 'BENCHMARK'].includes(t)) return 'text-neon-cyan';
    return 'text-bright-yellow';
  };

  const bullets = summary.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^[•\-\*]\s*/, ''));

  return (
    <article className={`card-dedsec flex flex-col h-full group ${isHero ? 'md:col-span-2 lg:col-span-3 min-h-[350px]' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4 text-xs font-mono text-neutral-500">
        <div className="flex items-center gap-2">
          <span>{source_name}</span>
          <span>//</span>
          <span>{date}</span>
        </div>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            onTagClick && onTagClick(short_tag);
          }}
          className={`font-bold hover:underline cursor-pointer ${getTagColor(short_tag)}`}
        >
          &lt; {short_tag} /&gt;
        </button>
      </div>

      {/* Title */}
      <h3 className={`font-heading leading-tight mb-4 text-white group-hover:text-neon-cyan transition-colors duration-200 ${isHero ? 'text-4xl md:text-5xl uppercase' : 'text-2xl'}`}>
        <a href={original_url} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
          {title}
        </a>
      </h3>

      {/* Content */}
      <div className="flex-grow">
        <ul className={`font-mono text-light-gray opacity-80 space-y-2 ${isHero ? 'text-lg' : 'text-sm'}`}>
          {bullets.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-neutral-500">{'>'}</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Footer */}
      <div className="mt-6 flex justify-between items-end gap-4 relative z-10">
         <ImpactBar score={impact_score} />
         
         <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                e.preventDefault();
                onSave && onSave(article);
              }}
              className={`text-xs font-mono px-2 py-1 border transition-colors ${isSaved ? 'bg-neon-cyan text-black border-neon-cyan' : 'border-neutral-700 text-neutral-500 hover:border-neon-cyan hover:text-neon-cyan'}`}
            >
              [ {isSaved ? 'SAVED' : 'SAVE'} ]
            </button>
            <div className="text-neon-cyan opacity-50 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={16} />
            </div>
         </div>
      </div>
    </article>
  );
};

export default ArticleCard;
