'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import Image from 'next/image';

/**
 * Muestra un toast tipo "Instalar TerraGroup" en la esquina inferior derecha
 * cuando el navegador dispara `beforeinstallprompt` (Chrome/Edge/Samsung).
 * En iOS Safari (que no soporta la API), muestra un pop-over con instrucciones
 * paso a paso ("Compartir → Agregar a Pantalla de Inicio") cuando el usuario
 * está en móvil.
 *
 * Persistimos "dismissed" en localStorage para no bombardear al usuario si
 * cerró el prompt — se muestra otra vez si borra caché o pasa mucho tiempo.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tg_pwa_dismissed_at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function fueDescartadoRecientemente(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
}

function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function yaInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  // Standalone display mode indica que ya se abrió como PWA instalada.
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [modoIOS,  setModoIOS]  = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (yaInstalada()) return;
    if (fueDescartadoRecientemente()) return;

    // Chrome/Edge/Samsung — captura el evento y muestra CTA propio en vez del
    // banner nativo (que aparece cuando pasas la heurística de "engagement").
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari no dispara beforeinstallprompt — mostramos instrucciones
    // manualmente después de unos segundos si estamos en iOS.
    if (esIOS()) {
      const t = setTimeout(() => { setModoIOS(true); setVisible(true); }, 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onPrompt);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function descartar() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[80]"
      role="dialog"
      aria-labelledby="pwa-prompt-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fdf3d9] to-[#f8e4a8] flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/icon-192.png" alt="" width={40} height={40} className="rounded-lg"/>
          </div>
          <div className="min-w-0 flex-1">
            <p id="pwa-prompt-title" className="text-sm font-bold text-gray-900">Instalar TerraGroup</p>
            {modoIOS ? (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Tocá <b>Compartir</b> abajo y luego <b>Agregar a Pantalla de Inicio</b>. TerraGroup se abrirá como app nativa.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Ábrelo desde tu pantalla de inicio como una app nativa. Sin barra del navegador.
              </p>
            )}
          </div>
          <button
            onClick={descartar}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-700 shrink-0"
          >
            <X size={16}/>
          </button>
        </div>
        {!modoIOS && deferred && (
          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <button
              onClick={descartar}
              className="flex-1 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1.5"
            >
              Ahora no
            </button>
            <button
              onClick={instalar}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-xs py-2 rounded-lg"
            >
              <Download size={12}/> Instalar
            </button>
          </div>
        )}
        {modoIOS && (
          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 text-xs text-gray-500">
            <Smartphone size={12}/> iPhone / iPad
          </div>
        )}
      </div>
    </div>
  );
}
