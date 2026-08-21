import type { CSSProperties, ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

function Card({ children, style, className = '' }: CardProps) {
  return (
    <section
      className={`pfi-card ${className}`.trim()}
      style={{ padding: 20, marginBottom: 16, ...style }}
    >
      {children}
    </section>
  );
}

export default Card;
