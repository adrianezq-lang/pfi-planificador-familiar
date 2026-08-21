import type { ReactNode } from 'react';
import { colores } from '../../styles/themes';

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
};

function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: colores.verde,
        color: colores.blanco,
        border: 'none',
        borderRadius: 12,
        padding: '12px 18px',
        cursor: 'pointer',
        fontSize: 16,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

export default Button;