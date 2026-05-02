import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="TerraGroup" width={40} height={40} className="rounded-lg" />
              <span className="font-bold text-xl"><span className="text-white">Terra</span><span className="text-[#d4a843]">Group</span></span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Conectamos tu proyecto con eficiencia. La plataforma #1 para gestiÃ³n de cobranza en empresas de lotificaciÃ³n.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Producto</h4>
            <ul className="flex flex-col gap-2 text-gray-400 text-sm">
              <li><a href="#funciones" className="hover:text-white transition-colors">Funciones</a></li>
              <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
              <li><a href="#testimonios" className="hover:text-white transition-colors">Testimonios</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Ingresar</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-white">Soporte</h4>
            <ul className="flex flex-col gap-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Centro de ayuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition-colors">TÃ©rminos de uso</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">
            Â© {new Date().getFullYear()} TerraGroup. Todos los derechos reservados.
          </p>
          <p className="text-gray-500 text-xs">Conectamos tu proyecto con eficiencia.</p>
        </div>
      </div>
    </footer>
  );
}
