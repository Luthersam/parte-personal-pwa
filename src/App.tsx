import { useState, useEffect, Fragment, useRef } from 'react';
import html2canvas from 'html2canvas';
import './styles.css';
import { MonitorEnVivo } from './components/MonitorEnVivo';
import { MonitorConsolidado } from './components/MonitorConsolidado';
import { FormularioDetallado } from './components/FormularioDetallado';
import { ColectaModal } from './ColectaModal';
import { InstalarModal } from './InstalarModal';
import { useBotonAtras } from './atras';
import { URL_PRIVACIDAD } from './nativo';
import { EscanerModal } from './EscanerModal';
import { EnvioSinInternet } from './EnvioSinInternet';
import { ColectaSinInternetModal } from './ColectaSinInternetModal';
import { EnvioUnidad } from './EnvioUnidad';
import { yaInstalada, esAndroid, esIOS } from './instalar';
import type { InstalarEvento } from './instalar';
import { useParteStore } from './useParteStore';
import { obtenerPartesHoy, guardarParte, borrarPartesHoy, initDB, obtenerPartePorUnidad } from './db';
import type { ParteGeonumerico, Cuarteto, NovedadesData } from './types';
import { Icono } from './Icono';

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
  const [showColecta, setShowColecta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [showEscaner, setShowEscaner] = useState(false);
  // Datos de conexión leídos del QR del coordinador: muestra el formulario de envío dentro de la app
  const [envio, setEnvio] = useState<{ peerId: string; token: string } | null>(null);
  const [showEnvioOffline, setShowEnvioOffline] = useState(false);
  const [showColectaOffline, setShowColectaOffline] = useState(false);
  // Si la app no está instalada, la ventana de instalación se abre sola al entrar
  const [showInstalar, setShowInstalar] = useState(() => !yaInstalada());
  const [eventoInstalar, setEventoInstalar] = useState<InstalarEvento | null>(null);

  const cargarPartesHoy = async () => {
    try {
      const partes = await obtenerPartesHoy();
      setPartesHoy(partes.map((p) => ({ ...p, fecha: new Date(p.fecha) })));
    } catch (err) {
      console.error('Error cargando partes:', err);
    }
  };

  useEffect(() => {
    initDB()
      .catch((err) => console.error('Error iniciando BD:', err))
      .then(() => cargarPartesHoy());
  }, []);

  // Chrome en Android avisa cuando la app se puede instalar con un solo botón
  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault();
      setEventoInstalar(e as InstalarEvento);
    };
    window.addEventListener('beforeinstallprompt', alOfrecer);
    return () => window.removeEventListener('beforeinstallprompt', alOfrecer);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(id);
  }, [aviso]);

  const totalesConsolidado = () => {
    const ef: Cuarteto = { of: 0, sub: 0, pt: 0, axp: 0 };
    const novedades: Cuarteto = { of: 0, sub: 0, pt: 0, axp: 0 };

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
      setAviso(`Parte de ${parte.unidadNombre.toUpperCase()} guardado`);
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
    if (!confirm('¿Borrar todos los registros de hoy y limpiar el formulario?')) return;

    // Se vacía la pantalla al instante; luego se borra de la base y se vuelve a leer para confirmar
    setPartesHoy([]);
    store.limpiar();
    setError('');
    try {
      await borrarPartesHoy();
      setAviso('Registros de hoy borrados');
    } catch (err) {
      console.error('Error borrando:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`No se pudieron borrar los registros: ${msg}`);
    } finally {
      await cargarPartesHoy();
    }
  };

  const esActualizacion = partesHoy.some(
    (p) => p.unidadNombre.toUpperCase() === store.store.unidadNombre.toUpperCase()
  );

  const consolidado = totalesConsolidado();
  const totales = store.obtenerTotales();

  if (envio) {
    return <EnvioUnidad peerId={envio.peerId} token={envio.token} onVolver={() => setEnvio(null)} />;
  }

  if (showEnvioOffline) {
    return <EnvioSinInternet onVolver={() => setShowEnvioOffline(false)} />;
  }

  return (
    <div className="app">
      <div className="app__header">
        <h1>PARTE DE PERSONAL</h1>
      </div>

      <div className="app__content">
        <MonitorEnVivo ef={store.store.ef} novedades={totales.novedades} />

        {error && <div className="aviso-error">{error}</div>}

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
            {esActualizacion ? <Icono nombre="actualizar" /> : <Icono nombre="guardar" />}
            {esActualizacion ? 'ACTUALIZAR' : 'GUARDAR'}
          </button>
          <button onClick={() => setShowReporte(true)} className="btn btn--primary">
            <Icono nombre="reporte" />
            REPORTE
          </button>
          <button onClick={limpiarHoy} className="btn btn--danger">
            <Icono nombre="limpiar" />
            LIMPIAR
          </button>
        </div>
        <div className="button-group" style={{ marginTop: '6px', gridTemplateColumns: '1fr' }}>
          <button onClick={() => setShowColecta(true)} className="btn btn--primary">
            <Icono nombre="qr" />
            RECIBIR POR QR
          </button>
        </div>
        <div className="button-group" style={{ marginTop: '0', gridTemplateColumns: '1fr 1fr' }}>
          <button onClick={() => setShowColectaOffline(true)} className="btn btn--primary">
            <Icono nombre="qr" />
            RECIBIR SIN INTERNET
          </button>
          <button onClick={() => setShowEnvioOffline(true)} className="btn btn--primary">
            <Icono nombre="escanear" />
            ENVIAR SIN INTERNET
          </button>
        </div>
        {esAndroid() && (
          <div className="button-group" style={{ marginTop: '0', gridTemplateColumns: '1fr' }}>
            <button onClick={() => setShowEscaner(true)} className="btn btn--primary">
              <Icono nombre="escanear" />
              ENVIAR MI PARTE (ESCANEAR QR)
            </button>
          </div>
        )}
        {esIOS() && (
          <p className="nota">
            Para enviar su parte: escanee el QR del coordinador con la cámara del iPhone o iPad. Se abrirá en Safari.
          </p>
        )}

        {partesHoy.length > 0 && (
          <div>
            <h3 className="unidades-titulo">Unidades registradas hoy (toque para editar)</h3>
            <div className="unidades-lista">
              {partesHoy.map((parte) => (
                <button
                  key={parte.id}
                  onClick={() => cargarParaEditar(parte.unidadNombre)}
                  className="chip-unidad"
                >
                  {parte.unidadNombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <MonitorConsolidado ef={consolidado.ef} novedades={consolidado.novedades} />

        {!yaInstalada() && (
          <button className="btn-link" onClick={() => setShowInstalar(true)}>
            <Icono nombre="descargar" />
            ¿Cómo instalar la app en su celular?
          </button>
        )}

        <p className="nota-legal">
          <a href={URL_PRIVACIDAD} target="_blank" rel="noopener noreferrer">
            Política de privacidad
          </a>
        </p>
      </div>

      {showEscaner && (
        <EscanerModal
          onLeido={(datos) => {
            setShowEscaner(false);
            setEnvio(datos);
          }}
          onClose={() => setShowEscaner(false)}
        />
      )}

      {showInstalar && <InstalarModal evento={eventoInstalar} onClose={() => setShowInstalar(false)} />}

      {aviso && (
        <div className="toast" role="status">
          <Icono nombre="circuloOk" />
          {aviso}
        </div>
      )}

      {showColectaOffline && (
        <ColectaSinInternetModal
          onAprobar={async (parte) => {
            await guardarParte(parte);
            await cargarPartesHoy();
          }}
          onClose={() => setShowColectaOffline(false)}
        />
      )}

      {showColecta && (
        <ColectaModal
          onAprobar={async (parte) => {
            await guardarParte(parte);
            await cargarPartesHoy();
          }}
          onClose={() => setShowColecta(false)}
        />
      )}

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
  useBotonAtras(onClose);
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
    texto += `T. EFECTIVA:  OF ${ef.of} | SUB ${ef.sub} | PT/PP ${ef.pt} | AXP ${ef.axp}\n`;
    texto += `T. NOVEDADES: OF ${nov.of} | SUB ${nov.sub} | PT/PP ${nov.pt} | AXP ${nov.axp}\n`;
    texto += `T. DISPONIBLE: OF ${disp.of} | SUB ${disp.sub} | PT/PP ${disp.pt} | AXP ${disp.axp}\n`;

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
      texto += `EF: OF ${parte.ef_of} SUB ${parte.ef_sub} PT/PP ${parte.ef_pt} AXP ${parte.ef_axp}\n`;
      texto += `NOV: OF ${parte.nov_total_of} SUB ${parte.nov_total_sub} PT/PP ${parte.nov_total_pt} AXP ${parte.nov_total_axp}\n`;
      texto += `DISP: OF ${dp.of} SUB ${dp.sub} PT/PP ${dp.pt} AXP ${dp.axp}\n`;
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
        try {
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
        } catch (err) {
          // AbortError = el usuario canceló el diálogo de compartir
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            console.error('Error compartiendo imagen:', err);
          }
        } finally {
          setCompartiendo(false);
        }
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
            <img className="reporte-modal__shield" src="/icon-192.png" alt="" width={40} height={40} />
            <div className="reporte-modal__header-text">
              <h2>Parte de Personal</h2>
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
            placeholder="Digita aquí la sigla de tu UNIDAD"
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
                <th>PT/PP</th>
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
                <th>PT/PP</th>
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
              <Icono nombre="imagen" />
              {compartiendo ? 'GENERANDO...' : 'IMAGEN'}
            </button>
            <button className="btn-whatsapp" onClick={compartirTexto} style={{ flex: 1, background: '#128c7e' }}>
              <Icono nombre="texto" />
              TEXTO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
