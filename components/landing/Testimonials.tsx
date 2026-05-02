const TESTIMONIALS = [
  {
    name: 'Carlos Mendoza',
    role: 'Director, Lotificaciones del Norte',
    avatar: 'CM',
    text: 'Desde que usamos TerraGroup nuestros cobros tardíos bajaron un 40%. El sistema de alertas automáticas es increíble.',
  },
  {
    name: 'María Rivas',
    role: 'Administradora, Terrenos Pacífico',
    avatar: 'MR',
    text: 'Antes tardaba días en generar reportes. Ahora los tengo en segundos y los puedo exportar en PDF para mis socios.',
  },
  {
    name: 'Roberto Fuentes',
    role: 'Gerente, Desarrollos San Pablo',
    avatar: 'RF',
    text: 'El control de vendedores y comisiones nos ahorró muchos conflictos internos. Muy recomendado para empresas grandes.',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonios" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm font-semibold uppercase tracking-widest">Testimonios</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#d4a843">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
