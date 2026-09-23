import Recetas from './Recetas';

export default function Postres({
  ingredientePendiente,
  onAsociacionAbierta,
}: {
  ingredientePendiente?: string | null;
  onAsociacionAbierta?: () => void;
}) {
  return (
    <Recetas
      modo="postres"
      ingredientePendiente={ingredientePendiente}
      onAsociacionAbierta={onAsociacionAbierta}
    />
  );
}
