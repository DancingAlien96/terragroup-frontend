import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

interface Props {
  titulo: string;
  vigenteDesde: string;       // "21 de junio de 2026"
  ultimaActualizacion: string; // idem
  children: React.ReactNode;
}

export default function LegalLayout({ titulo, vigenteDesde, ultimaActualizacion, children }: Props) {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-[#1a1a1a] text-white px-6 py-3 flex items-center justify-between shadow sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="TerraGroup" width={28} height={28} className="rounded" />
          <span className="text-base font-bold tracking-tight">
            Terra<span className="text-[#d4a843]">Group</span>
          </span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] mb-3">{titulo}</h1>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span><strong className="text-gray-700">Vigente desde:</strong> {vigenteDesde}</span>
            <span><strong className="text-gray-700">Última actualización:</strong> {ultimaActualizacion}</span>
          </div>
        </div>

        <article className="prose prose-sm sm:prose-base max-w-none
          [&_h2]:text-[#1a1a1a] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl
          [&_h3]:text-[#1a1a1a] [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base
          [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:my-3
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-gray-700 [&_ul]:my-3
          [&_li]:my-1
          [&_strong]:text-[#1a1a1a]
          [&_a]:text-[#d4a843] [&_a:hover]:underline">
          {children}
        </article>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            ¿Dudas o consultas? Escríbenos a{' '}
            <a href="mailto:terragroup692@gmail.com" className="text-[#d4a843] hover:underline font-semibold">
              terragroup692@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
