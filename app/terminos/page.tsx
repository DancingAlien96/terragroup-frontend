import LegalLayout from '@/components/legal/LegalLayout';
import TerminosContent from '@/components/legal/contents/TerminosContent';

export const metadata = {
  title: 'Términos y Condiciones — TerraGroup',
  description: 'Términos de uso del servicio TerraGroup.',
};

export default function TerminosPage() {
  return (
    <LegalLayout
      titulo="Términos y Condiciones de Uso"
      vigenteDesde="21 de junio de 2026"
      ultimaActualizacion="21 de junio de 2026"
    >
      <TerminosContent />
    </LegalLayout>
  );
}
