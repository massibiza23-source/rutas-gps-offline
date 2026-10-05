/**
 * Subterranean 3D Mapping & Offline Tracking PRD & UI Design Specification
 * Exhaustive Product Requirements Document with mathematical models,
 * sensor fusion architecture, power budgets, and hostile-environment UI standards.
 */

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Cpu,
  Layers,
  Battery,
  Shield,
  Eye,
  FileCode,
  Download,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface PRDViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PRDViewer: React.FC<PRDViewerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sensors' | 'ui' | 'battery' | 'data' | 'prd'>('prd');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6">
      <div className="w-full max-w-4xl h-[92vh] bg-slate-950 border-2 border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-950 border border-sky-500/40 text-sky-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                PRD & Especificación de UI / Cueva 3D
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Sistema Autónomo de Navegación Subterránea y Topografía Espeleológica
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('prd')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'prd'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            1. Documento PRD Completo
          </button>

          <button
            onClick={() => setActiveTab('sensors')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'sensors'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            2. Sensor Fusion (Inercial + Barómetro)
          </button>

          <button
            onClick={() => setActiveTab('ui')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'ui'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            3. Diseño UI para Entornos Hostiles
          </button>

          <button
            onClick={() => setActiveTab('battery')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'battery'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            4. Presupuesto Energético (Batería)
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'data'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            5. Formatos & Almacenamiento Offline
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'prd' && (
            <div className="space-y-6">
              <section className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-mono uppercase font-bold text-sky-400">
                  Resumen Ejecutivo
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Mapeador 3D Espeleológico Autónomo (SpeleoTrack 3D)
                </h3>
                <p className="mt-2 text-slate-300">
                  Aplicación móvil táctica para espeleólogos y rescatistas subterráneos. Proporciona
                  topografía tridimensional en tiempo real, seguimiento de avance y cálculo de cota
                  vertical en entornos karsticos y volcánicos donde las ondas electromagnéticas (GPS,
                  4G/5G, Wi-Fi) son atenuadas al 100% por la roca maciza.
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Objetivos de Producto
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-slate-300 text-xs list-disc list-inside">
                    <li>Rastreo inercial continuo (PDR) con error de posición &lt; 5% por 100m.</li>
                    <li>Cálculo de profundidad Z milimétrica mediante microbarómetro calibrado.</li>
                    <li>Visualización 3D interactiva con vista de alzado, planta y órbita.</li>
                    <li>Autonomía superior a 18 horas de uso ininterrumpido en modo táctico.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <h4 className="font-bold text-rose-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Entorno Operativo Extremo
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-slate-300 text-xs list-disc list-inside">
                    <li>Humedad relativa del 98–100% y goteo constante de agua kárstica.</li>
                    <li>Uso obligado con guantes gruesos de neopreno y barro.</li>
                    <li>Oscuridad absoluta: necesidad de preservar la rodopsina ocular.</li>
                    <li>Riesgo vital de desorientación o extravío en laberintos subterráneos.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sensors' && (
            <div className="space-y-6">
              <section className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Cpu className="w-5 h-5" />
                  <span>Método Técnico de Registro Offline (Sensor Fusion)</span>
                </div>

                <p className="text-slate-300 text-xs">
                  Al no existir satélites, el sistema fusiona tres fuentes de datos cinemáticos y
                  atmosféricos a través de un <strong>Filtro de Kalman Extendido (EKF)</strong>:
                </p>

                {/* Sub-item 1: Acelerómetro */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-400 text-xs uppercase tracking-wider">
                    A. Acelerómetro Triaxial (PDR - Pedestrian Dead Reckoning)
                  </div>
                  <p className="text-xs text-slate-300">
                    Calcula la magnitud del vector de aceleración corregido por gravedad:
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-xs text-emerald-300 text-center">
                    |a(t)| = √(a_x² + a_y² + a_z²) - g
                  </div>
                  <p className="text-xs text-slate-400">
                    Detecta picos de paso mediante umbral adaptativo (Peak-Valley Detection).
                    La longitud de zancada o avance en gatera se modela con la fórmula de Weinberg:
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-xs text-emerald-300 text-center">
                    Stride = k · (a_max - a_min)^(1/4)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Donde <em>k</em> se calibra automáticamente en función del techo de la cueva
                    (k = 0.44 en galería alta, k = 0.30 arrastrándose en gatera).
                  </p>
                </div>

                {/* Sub-item 2: Giróscopo y Magnetómetro */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-sky-400 text-xs uppercase tracking-wider">
                    B. Giróscopo + Magnetómetro (Orientación Cuaterniónica)
                  </div>
                  <p className="text-xs text-slate-300">
                    Integra la tasa de rotación angular (Yaw, Pitch, Roll) mitigando la deriva
                    inercial mediante el algoritmo de Madgwick a 30 Hz.
                  </p>
                  <p className="text-xs text-slate-400">
                    <strong>Zero Velocity Update (ZUPT):</strong> Cada vez que el espeleólogo se
                    detiene para equipar un anclaje o instalar una cuerda, el sensor detecta
                    inmovilidad y resetea los errores residuales acumulados de velocidad lineal.
                  </p>
                </div>

                {/* Sub-item 3: Barómetro */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-rose-400 text-xs uppercase tracking-wider">
                    C. Barómetro Piezoeléctrico (Cota Vertical Z Exacta)
                  </div>
                  <p className="text-xs text-slate-300">
                    En cuevas profundas, la columna de aire genera un aumento medible y monótono
                    de la presión hidrostática (aprox. +1.0 hPa cada ~8.43 metros de descenso).
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-xs text-rose-300 text-center">
                    ΔZ = (R · T_cave) / (g · M) · ln(P_boca / P_actual)
                  </div>
                  <p className="text-xs text-slate-400">
                    Al ingresar a la boca de la cavidad se realiza una calibración de cero (P_boca).
                    A diferencia del GPS que tiene un error vertical de 15 a 30 metros, el barómetro
                    ofrece una resolución vertical milimétrica de 10 a 20 centímetros.
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="space-y-6">
              <section className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Eye className="w-5 h-5" />
                  <span>Especificación de Interfaz para Entornos Hostiles</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                      1. Botones para Guantes de Neopreno
                    </h5>
                    <p className="text-xs text-slate-300">
                      Objetivos táctiles sobredimensionados con área mínima de impacto de{' '}
                      <strong>52x52 píxeles</strong> y borde táctil de 2px de alto relieve.
                    </p>
                    <p className="text-xs text-slate-400">
                      Espaciado de 12px entre elementos para evitar toques accidentales cuando la
                      pantalla está salpicada con gotas de agua o barro.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="font-bold text-rose-400 text-xs uppercase tracking-wider">
                      2. Modo Monocromático Rojo (Red-Lamp)
                    </h5>
                    <p className="text-xs text-slate-300">
                      Longitud de onda de 630 nm que no degrada la rodopsina retiniana. Permite al
                      espeleólogo alternar entre consultar la pantalla del teléfono y mirar la cueva
                      con el frontal sin perder adaptación a la oscuridad.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="font-bold text-amber-400 text-xs uppercase tracking-wider">
                      3. Modo Ámbar de Alto Contraste
                    </h5>
                    <p className="text-xs text-slate-300">
                      Diseñado para visibilidad a través de fundas estancas de PVC transparente con
                      niebla o condensación interior por el cambio de temperatura térmica.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <h5 className="font-bold text-sky-400 text-xs uppercase tracking-wider">
                      4. Señalización SOS y Retorno Seguro
                    </h5>
                    <p className="text-xs text-slate-300">
                      Botón de emergencia persistente que activa estroboscopio visual blanco/rojo
                      en la pantalla para localización por equipos de socorro en caso de rescate.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'battery' && (
            <div className="space-y-6">
              <section className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Battery className="w-5 h-5" />
                  <span>Presupuesto Energético & Autonomía Subterránea</span>
                </div>

                <p className="text-slate-300 text-xs">
                  En una cavidad profunda no hay tomas de corriente y el frío kárstico (4°C a 12°C)
                  reduce la capacidad efectiva de las baterías de litio en un 25%. El sistema aplica
                  las siguientes optimizaciones críticas:
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold">Negro Puro OLED (#000000)</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Apaga completamente los píxeles OLED en el 85% de la interfaz.
                      </p>
                    </div>
                    <span className="text-emerald-400 font-bold">-40% consumo pantalla</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold">Muestreo Inercial Adaptativo</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Tasa de refresco a 15 Hz en descansos y 30 Hz en avance activo.
                      </p>
                    </div>
                    <span className="text-sky-400 font-bold">-35% consumo CPU</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold">Apagado de Radios RF</span>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Desconexión total de búsqueda de antenas móviles y escaneo GPS estéril.
                      </p>
                    </div>
                    <span className="text-amber-400 font-bold">-25% drenaje inútil</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <section className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <FileCode className="w-5 h-5" />
                  <span>Formatos de Intercambio Espeleológico & Almacenamiento</span>
                </div>

                <p className="text-slate-300 text-xs">
                  Los datos se persisten de manera inmediata en la base de datos local transaccional
                  IndexedDB / SQLite bajo la especificación estándar de topografía subterránea:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-sky-400 font-mono text-xs">Survex (.3d / .svx)</span>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Estándar internacional de topografía para grandes redes kársticas con cierre de bucles.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 font-mono text-xs">Therion (.th / .th2)</span>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Modelado vectorial de paredes con polígonos LRUD (Left, Right, Up, Down).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-amber-400 font-mono text-xs">Compass / TopoDroid</span>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Compatibilidad directa con medidores láser DistoX y visualizadores de campo.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">Documento Técnico v2.4 · SpeleoTrack 3D</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition cursor-pointer"
          >
            Volver al Mapa 3D
          </button>
        </div>
      </div>
    </div>
  );
};
