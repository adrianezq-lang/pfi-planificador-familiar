import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import { useRecetas } from '../hooks/useRecetas';
import { esRecetaPostre } from '../services/recetas';

export default function Postres() {
  const { recetas } = useRecetas();
  const postres = recetas.filter(esRecetaPostre);

  return (
    <main className="page legacy-page">
      <Card className="page-hero-card page-hero-card--compact">
        <Title style={{ color: '#4f6f52' }}>🍰 Postres</Title>
        <p style={{ margin: 0, color: '#667267' }}>
          Tus postres, separados del resto del recetario para encontrarlos rápidamente.
        </p>
      </Card>

      {postres.length === 0 ? (
        <Card>
          <p style={{ margin: 0 }}>Todavía no tienes postres en el recetario.</p>
        </Card>
      ) : (
        <section className="recipes-grid" aria-label="Postres">
          {postres.map((receta) => (
            <Card key={receta.nombre} style={{ marginBottom: 0 }}>
              <Title style={{ color: '#4f6f52', fontSize: '21px' }}>
                {receta.nombre}
              </Title>
              <span className="recipe-category">{receta.categoria}</span>
              <div style={{ marginTop: 14 }}>
                {receta.ingredientes.map((ingrediente) => (
                  <div
                    key={`${receta.nombre}-${ingrediente.nombre}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: '1px solid #edf1ed',
                    }}
                  >
                    <span>{ingrediente.nombre}</span>
                    <strong>{ingrediente.cantidad} {ingrediente.unidad}</strong>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
