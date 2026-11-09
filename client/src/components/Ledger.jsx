/** Dashed "receipt" frame with + corner marks (inspired by technical drawings / till receipts). */
const CORNERS = ['-left-[4px] -top-[6px]', '-right-[4px] -top-[6px]', '-left-[4px] -bottom-[6px]', '-right-[4px] -bottom-[6px]'];

const Ledger = ({ children, className = '' }) => (
  <div className={`ledger ${className}`}>
    {CORNERS.map((c) => <span key={c} className={`ledger-mark ${c}`} aria-hidden="true">+</span>)}
    {children}
  </div>
);

export default Ledger;
