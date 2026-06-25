import LegalLayout from '@/components/legal/LegalLayout';
import PrivacidadContent from '@/components/legal/contents/PrivacidadContent';

export const metadata = {
  title: 'Política de Privacidad — TerraGroup',
  description: 'Cómo TerraGroup recopila, usa y protege los datos personales de sus usuarios.',
};

export default function PrivacidadPage() {
  return (
    <LegalLayout
      titulo="Política de Privacidad"
      vigenteDesde="21 de junio de 2026"
      ultimaActualizacion="21 de junio de 2026"
    >
      <PrivacidadContent />
    </LegalLayout>
  );
}
