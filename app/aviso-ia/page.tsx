import LegalLayout from '@/components/legal/LegalLayout';
import AvisoIAContent from '@/components/legal/contents/AvisoIAContent';

export const metadata = {
  title: 'Aviso sobre uso de Inteligencia Artificial — TerraGroup',
  description: 'Divulgación transparente sobre el uso de IA generativa en el desarrollo y operación de TerraGroup.',
};

export default function AvisoIAPage() {
  return (
    <LegalLayout
      titulo="Aviso sobre el uso de Inteligencia Artificial"
      vigenteDesde="21 de junio de 2026"
      ultimaActualizacion="21 de junio de 2026"
    >
      <AvisoIAContent />
    </LegalLayout>
  );
}
