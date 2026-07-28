import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
};

function Section({ children }: SectionProps) {
  return (
    <section
      style={{
        marginBottom: 24,
      }}
    >
      {children}
    </section>
  );
}

export default Section;