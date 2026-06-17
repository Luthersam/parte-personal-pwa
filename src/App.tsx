import { useState, useEffect, Fragment, useRef } from 'react';
import html2canvas from 'html2canvas';
import './styles.css';
import { MonitorEnVivo } from './components/MonitorEnVivo';
import { MonitorConsolidado } from './components/MonitorConsolidado';
import { FormularioDetallado } from './components/FormularioDetallado';
import { useParteStore } from './useParteStore';
import { obtenerPartesHoy, guardarParte, borrarPartesHoy, initDB, obtenerPartePorUnidad } from './db';
import type { ParteGeonumerico, Cuarteto, NovedadesData } from './types';

const CATEGORIAS_LABELS = [
  'COMISIÓN',
  'EXCUSADO SERVICIO',
  'FRANQUICIA',
  'PERMISO',
  'VACACIONES',
  'SERVICIOS',
  'RETARDADO',
  'HORARIO FLEXIBLE',
  'OTROS',
];

function App() {
  const store = useParteStore();
  const [partesHoy, setPartesHoy] = useState<ParteGeonumerico[]>([]);
  const [error, setError] = useState('');
  const [showReporte, setShowReporte] = useState(false);

  useEffect(() => {
    initDB().then(() => cargarPartesHoy());
  }, []);

  const cargarPartesHoy = async () => {
    try {
      const partes = await obtenerPartesHoy();
      setPartesHoy(partes.map((p) => ({ ...p, fecha: new Date(p.fecha) })));
    } catch (err) {
      console.error('Error cargando partes:', err);
    }
  };

  const totalesConsolidado = () => {
    let ef: Cuarteto = { of: 0, sub: 0, pt: 0, axp: 0 };
    let novedades: Cuarteto = { of: 0, sub: 0, pt: 0, axp: 0 };

    for (const parte of partesHoy) {
      ef.of += parte.ef_of;
      ef.sub += parte.ef_sub;
      ef.pt += parte.ef_pt;
      ef.axp += parte.ef_axp;
      novedades.of += parte.nov_total_of;
      novedades.sub += parte.nov_total_sub;
      novedades.pt += parte.nov_total_pt;
      novedades.axp += parte.nov_total_axp;
    }

    return { ef, novedades };
  };

  const validar = () => {
    const totales = store.obtenerTotales();
    if (
      totales.disponible.of < 0 ||
      totales.disponible.sub < 0 ||
      totales.disponible.pt < 0 ||
      totales.disponible.axp < 0
    ) {
      setError('Las novedades superan la Fuerza Efectiva.');
      return false;
    }
    if (!store.store.unidadNombre.trim()) {
      setError('Ingrese nombre de unidad.');
      return false;
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;

    try {
      const totales = store.obtenerTotales();
      const parte: ParteGeonumerico = {
        titulo: 'Diario',
        fecha: new Date(),
        unidadNombre: store.store.unidadNombre,
        ef_of: store.store.ef.of,
        ef_sub: store.store.ef.sub,
        ef_pt: store.store.ef.pt,
        ef_axp: store.store.ef.axp,
        nov_total_of: totales.novedades.of,
        nov_total_sub: totales.novedades.sub,
        nov_total_pt: totales.novedades.pt,
        nov_total_axp: totales.novedades.axp,
        elaboradoPor: store.store.elaboradoPor,
        novedadesJSON: JSON.stringify(store.convertirADict()),
      };

      await guardarParte(parte);
      store.limpiar();
      await cargarPartesHoy();
      setError('');
    } catch (err) {
      console.error('Error guardando:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error al guardar: ${msg}`);
    }
  };

  const cargarParaEditar = async (unidad: string) => {
    try {
      const parte = await obtenerPartePorUnidad(unidad);
      if (parte) {
        store.setStore({
          ...store.store,
          unidadNombre: parte.unidadNombre,
          ef: { of: parte.ef_of, sub: parte.ef_sub, pt: parte.ef_pt, axp: parte.ef_axp },
          elaboradoPor: parte.elaboradoPor,
        });
        const novedades = JSON.parse(parte.novedadesJSON || '{}');
        store.cargarDesdeDict(novedades);
      }
    } catch (err) {
      console.error('Error cargando para editar:', err);
    }
  };

  const limpiarHoy = async () => {
    if (confirm('¿Borrar todos los registros de hoy?')) {
      try {
        await borrarPartesHoy();
        await cargarPartesHoy();
      } catch (err) {
        console.error('Error borrando:', err);
      }
    }
  };

  const esActualizacion = partesHoy.some(
    (p) => p.unidadNombre.toUpperCase() === store.store.unidadNombre.toUpperCase()
  );

  const consolidado = totalesConsolidado();
  const totales = store.obtenerTotales();

  return (
    <div className="app">
      <div className="app__header">
        <h1>PARTE DE PERSONAL</h1>
        <p style={{ fontSize: '10px', margin: '1px 0 0', color: 'rgba(0,0,0,0.65)' }}>
          Policía Nacional de Colombia
        </p>
      </div>

      <div className="app__content">
        <MonitorEnVivo ef={store.store.ef} novedades={totales.novedades} />

        {error && (
          <div
            style={{
              background: 'rgba(255,0,0,0.15)',
              padding: '8px 12px',
              borderRadius: '4px',
              marginBottom: '10px',
              color: '#ff6666',
              fontSize: '12px',
            }}
          >
            {error}
          </div>
        )}

        <FormularioDetallado
          unidadNombre={store.store.unidadNombre}
          elaboradoPor={store.store.elaboradoPor}
          ef={store.store.ef}
          comision={store.store.comision}
          excusado={store.store.excusado}
          franquicia={store.store.franquicia}
          permiso={store.store.permiso}
          vacaciones={store.store.vacaciones}
          servicios={store.store.servicios}
          retardado={store.store.retardado}
          horarioFlexible={store.store.horarioFlexible}
          otros={store.store.otros}
          nombresDict={store.store.nombresDict}
          onUnidadChange={(v) => store.setStore({ ...store.store, unidadNombre: v })}
          onElaboradoPorChange={(v) => store.setStore({ ...store.store, elaboradoPor: v })}
          onEFChange={store.updateEF}
          onNovedadChange={store.updateNovedad}
          onAddNombre={store.addNombre}
          onRemoveNombre={store.removeNombre}
        />

        <div className="button-group">
          <button onClick={guardar} className="btn btn--success">
            {esActualizacion ? '↻ ACTUALIZAR' : '✓ GUARDAR'}
          </button>
          <button onClick={() => setShowReporte(true)} className="btn btn--primary">
            📋 REPORTE
          </button>
          <button onClick={limpiarHoy} className="btn btn--danger">
            🗑 LIMPIAR
          </button>
        </div>

        <hr className="formulario__divider" style={{ marginTop: '8px' }} />

        {partesHoy.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', color: '#c8a000' }}>
              UNIDADES REGISTRADAS HOY
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {partesHoy.map((parte) => (
                <button
                  key={parte.id}
                  onClick={() => cargarParaEditar(parte.unidadNombre)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(200,160,0,0.2)',
                    border: '1px solid rgba(200,160,0,0.3)',
                    borderRadius: '6px',
                    color: '#c8a000',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {parte.unidadNombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <MonitorConsolidado ef={consolidado.ef} novedades={consolidado.novedades} />
      </div>

      {showReporte && (
        <ReporteModal
          partesHoy={partesHoy}
          consolidado={consolidado}
          elaboradoPor={store.store.elaboradoPor}
          unidadPadre={store.store.unidadPadre}
          onClose={() => setShowReporte(false)}
        />
      )}
    </div>
  );
}

function ReporteModal({
  partesHoy,
  consolidado,
  elaboradoPor,
  unidadPadre,
  onClose,
}: {
  partesHoy: ParteGeonumerico[];
  consolidado: { ef: Cuarteto; novedades: Cuarteto };
  elaboradoPor: string;
  unidadPadre: string;
  onClose: () => void;
}) {
  const [padreInput, setPadreInput] = useState(unidadPadre || '');
  const [compartiendo, setCompartiendo] = useState(false);
  const reporteRef = useRef<HTMLDivElement>(null);

  const disp = {
    of: consolidado.ef.of - consolidado.novedades.of,
    sub: consolidado.ef.sub - consolidado.novedades.sub,
    pt: consolidado.ef.pt - consolidado.novedades.pt,
    axp: consolidado.ef.axp - consolidado.novedades.axp,
  };

  const fecha = new Date();
  const fechaStr = fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  // Construir relación de personal por categoría a partir de todos los partes
  const relacionPersonal: { [categoria: string]: { nombre: string; unidad: string }[] } = {};

  for (const categoria of CATEGORIAS_LABELS) {
    relacionPersonal[categoria] = [];
  }

  for (const parte of partesHoy) {
    try {
      const novedades: NovedadesData = JSON.parse(parte.novedadesJSON || '{}');
      for (const [categoria, data] of Object.entries(novedades)) {
        if (data.nombres && data.nombres.length > 0) {
          if (!relacionPersonal[categoria]) relacionPersonal[categoria] = [];
          for (const nombre of data.nombres) {
            relacionPersonal[categoria].push({ nombre, unidad: parte.unidadNombre });
          }
        }
      }
    } catch {
      // skip invalid JSON
    }
  }

  const categoriasConPersonal = CATEGORIAS_LABELS.filter(
    (c) => relacionPersonal[c] && relacionPersonal[c].length > 0
  );

  const compartirTexto = () => {
    const ef = consolidado.ef;
    const nov = consolidado.novedades;
    const unidadTitulo = padreInput || 'CONSOLIDADO';

    let texto = `*PARTE DE PERSONAL - ${unidadTitulo}*\n`;
    texto += `Fecha: ${fechaStr} ${horaStr}\n\n`;
    texto += `*RESUMEN GENERAL*\n`;
    texto += `T. EFECTIVA:  OF ${ef.of} | SUB ${ef.sub} | PT ${ef.pt} | AXP ${ef.axp}\n`;
    texto += `T. NOVEDADES: OF ${nov.of} | SUB ${nov.sub} | PT ${nov.pt} | AXP ${nov.axp}\n`;
    texto += `T. DISPONIBLE: OF ${disp.of} | SUB ${disp.sub} | PT ${disp.pt} | AXP ${disp.axp}\n`;

    if (categoriasConPersonal.length > 0) {
      texto += `\n*RELACIÓN DE PERSONAL POR NOVEDAD*\n`;
      for (const cat of categoriasConPersonal) {
        texto += `\n_${cat}_\n`;
        for (const p of relacionPersonal[cat]) {
          texto += `• ${p.nombre} (${p.unidad})\n`;
        }
      }
    }

    texto += `\n*DESGLOSE POR UNIDADES*\n`;
    for (const parte of partesHoy) {
      const dp = {
        of: parte.ef_of - parte.nov_total_of,
        sub: parte.ef_sub - parte.nov_total_sub,
        pt: parte.ef_pt - parte.nov_total_pt,
        axp: parte.ef_axp - parte.nov_total_axp,
      };
      texto += `\n${parte.unidadNombre.toUpperCase()}\n`;
      texto += `EF: OF ${parte.ef_of} SUB ${parte.ef_sub} PT ${parte.ef_pt} AXP ${parte.ef_axp}\n`;
      texto += `NOV: OF ${parte.nov_total_of} SUB ${parte.nov_total_sub} PT ${parte.nov_total_pt} AXP ${parte.nov_total_axp}\n`;
      texto += `DISP: OF ${dp.of} SUB ${dp.sub} PT ${dp.pt} AXP ${dp.axp}\n`;
    }

    if (elaboradoPor) texto += `\n_Elaboró: ${elaboradoPor.toUpperCase()}_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const compartirImagen = async () => {
    if (!reporteRef.current) return;
    setCompartiendo(true);
    try {
      const canvas = await html2canvas(reporteRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'reporte-parte-personal.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Parte de Personal - ${padreInput || 'CONSOLIDADO'}`,
          });
        } else {
          // Fallback: descargar la imagen
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reporte-parte-personal.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setCompartiendo(false);
      }, 'image/png');
    } catch (err) {
      console.error('Error generando imagen:', err);
      setCompartiendo(false);
    }
  };

  return (
    <div className="reporte-modal-overlay">
      <div className="reporte-modal">
        {/* Contenido capturado como imagen */}
        <div ref={reporteRef}>
        {/* Header dorado */}
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <div className="reporte-modal__shield">🛡</div>
            <div className="reporte-modal__header-text">
              <h2>Policía Nacional de Colombia</h2>
              <p>
                REPORTE CONSOLIDADO · {padreInput || 'ADMINISTRACIÓN'}
              </p>
              <p>{fechaStr}, {horaStr}</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {/* Cuerpo */}
        <div className="reporte-modal__body">
          <input
            type="text"
            value={padreInput}
            onChange={(e) => setPadreInput(e.target.value.toUpperCase())}
            placeholder="Unidad Superior (Ej. DEPU ARAUCA)"
            className="reporte-modal__unidad-input"
          />

          {/* Sección 1: Resumen general */}
          <div className="reporte-seccion-titulo">Resumen General Departamental</div>
          <table className="reporte-tabla-resumen">
            <thead>
              <tr>
                <th>CONCEPTO</th>
                <th>OF</th>
                <th>SUB</th>
                <th>PT</th>
                <th>AXP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>T. FUERZA EFECTIVA</td>
                <td>{consolidado.ef.of}</td>
                <td>{consolidado.ef.sub}</td>
                <td>{consolidado.ef.pt}</td>
                <td>{consolidado.ef.axp}</td>
              </tr>
              <tr>
                <td>T. NOVEDADES</td>
                <td>{consolidado.novedades.of}</td>
                <td>{consolidado.novedades.sub}</td>
                <td>{consolidado.novedades.pt}</td>
                <td>{consolidado.novedades.axp}</td>
              </tr>
              <tr className="row-disponible">
                <td>T. DISPONIBLE</td>
                <td>{disp.of}</td>
                <td>{disp.sub}</td>
                <td>{disp.pt}</td>
                <td>{disp.axp}</td>
              </tr>
            </tbody>
          </table>

          {/* Sección 2: Relación de personal por novedad */}
          {categoriasConPersonal.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Relación de Personal por Novedad</div>
              {categoriasConPersonal.map((cat) => (
                <div key={cat} className="reporte-relacion-categoria">
                  <h4>{cat}</h4>
                  <ul>
                    {relacionPersonal[cat].map((p, i) => (
                      <li key={i}>
                        {p.nombre} ({p.unidad})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {/* Sección 3: Desglose por unidades */}
          <div className="reporte-seccion-titulo">Desglose por Unidades</div>
          <table className="reporte-tabla-desglose">
            <thead>
              <tr>
                <th>CONCEPTO</th>
                <th>OF</th>
                <th>SUB</th>
                <th>PT</th>
                <th>AXP</th>
              </tr>
            </thead>
            <tbody>
              {partesHoy.map((parte) => {
                const dispParte = {
                  of: parte.ef_of - parte.nov_total_of,
                  sub: parte.ef_sub - parte.nov_total_sub,
                  pt: parte.ef_pt - parte.nov_total_pt,
                  axp: parte.ef_axp - parte.nov_total_axp,
                };
                return (
                  <Fragment key={parte.id}>
                    <tr>
                      <td colSpan={5} className="desglose-unidad-header">
                        {parte.unidadNombre.toUpperCase()}
                      </td>
                    </tr>
                    <tr>
                      <td>EFECTIVA</td>
                      <td>{parte.ef_of}</td>
                      <td>{parte.ef_sub}</td>
                      <td>{parte.ef_pt}</td>
                      <td>{parte.ef_axp}</td>
                    </tr>
                    <tr>
                      <td>NOVEDADES</td>
                      <td>{parte.nov_total_of}</td>
                      <td>{parte.nov_total_sub}</td>
                      <td>{parte.nov_total_pt}</td>
                      <td>{parte.nov_total_axp}</td>
                    </tr>
                    <tr className="row-disponible-desglose">
                      <td>DISPONIBLE</td>
                      <td>{dispParte.of}</td>
                      <td>{dispParte.sub}</td>
                      <td>{dispParte.pt}</td>
                      <td>{dispParte.axp}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Firma */}
          {elaboradoPor && (
            <div className="reporte-firma">
              <div className="reporte-firma__linea" />
              <div className="reporte-firma__nombre">{elaboradoPor.toUpperCase()}</div>
              <div className="reporte-firma__cargo">Elabora Parte de Personal</div>
            </div>
          )}
        </div>
        </div>{/* fin ref captura */}

        {/* Footer con botones de compartir */}
        <div className="reporte-modal__footer">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-whatsapp" onClick={compartirImagen} disabled={compartiendo} style={{ flex: 1 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {compartiendo ? 'GENERANDO...' : '📷 IMAGEN'}
            </button>
            <button className="btn-whatsapp" onClick={compartirTexto} style={{ flex: 1, background: '#128c7e' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              📝 TEXTO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
