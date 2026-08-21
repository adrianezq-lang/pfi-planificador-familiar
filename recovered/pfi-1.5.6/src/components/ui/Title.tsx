import type { CSSProperties, ReactNode } from 'react';

type TitleProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

function Title({ children, style, className = '' }: TitleProps) {
  return (
    <h2
      className={`pfi-title ${className}`.trim()}
      style={{
        margin: 0,
        marginBottom: 14,
        fontSize: '24px',
        fontWeight: 800,
        color: '#263229',
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export default Title;
