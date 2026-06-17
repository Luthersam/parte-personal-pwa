import { useState, useEffect } from 'react';
import './styles.css';
import { MonitorEnVivo } from './components/MonitorEnVivo';
import { MonitorConsolidado } from './components/MonitorConsolidado';
import { FormularioDetallado } from './components/FormularioDetallado';
import { useParteStore } from './useParteStore';
import { obtenerPartesHoy, guardarParte, borrarPartesHoy, initDB, obtenerPartePorUnidad } from './db';
import type { ParteGeonumerico, Cuarteto } from './types';

function App() {
  const store = useParteStore();
  const [partesHoy, setPartesHoy] = useState<ParteGeonumerico[]>([]);
  const [error, setError] = useState('');
  const [showReporte, setShowReporte] = useState(false);

  // Inicializar DB
  useEffect(() => {
    initDB().then(() => cargarPartesHoy());
  }, []);

  const cargarPartesHoy = async () => {
    try {
      const partes = await obtenerPartesHoy();
      setPartesHoy(partes.map((p) => ({
        ...p,
        fecha: new Date(p.fecha),
      })));
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
    if (totales.disponible.of < 0 || totales.disponible.sub < 0 ||
        totales.disponible.pt < 0 || totales.disponible.axp < 0) {
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
      setError('Error al guardar parte');
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

  const consolidado = totalesConsolidado();
  const totales = store.obtenerTotales();

  return (
    <div className="app">
      <div className="app__header">
        <h1>PARTE DE PERSONAL</h1>
        <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
          Policía Nacional de Colombia
        </p>
      </div>

      <div className="app__content">
        <MonitorEnVivo ef={store.store.ef} novedades={totales.novedades} />

        <div className="button-group">
          <button
            onClick={guardar}
            className="btn btn--success"
            title={
              partesHoy.some((p) => p.unidadNombre.toUpperCase() === store.store.unidadNombre.toUpperCase())
                ? 'Actualizar'
                : 'Guardar'
            }
          >
            {partesHoy.some((p) => p.unidadNombre.toUpperCase() === store.store.unidadNombre.toUpperCase())
              ? '↻ ACTUALIZAR'
              : '✓ GUARDAR'}
          </button>
          <button onClick={() => setShowReporte(true)} className="btn btn--primary">
            📋 REPORTE
          </button>
          <button onClick={limpiarHoy} className="btn btn--danger">
            🗑 LIMPIAR
          </button>
        </div>

        {error && <div style={{ background: 'rgba(255,0,0,0.2)', padding: '10px', borderRadius: '4px', marginBottom: '10px', color: '#ff6666' }}>{error}</div>}

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

        <hr className="formulario__divider" style={{ marginTop: '16px' }} />

        {partesHoy.length > 0 && (
          <div style={{ marginTop: '16px' }}>
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

        {showReporte && (
          <ReporteModal
            partesHoy={partesHoy}
            consolidado={consolidado}
            elaboradoPor={store.store.elaboradoPor}
            unidadPadre={store.store.unidadPadre}
            onClose={() => setShowReporte(false)}
          />
        )}

        <div style={{ marginBottom: '40px' }} />

        <MonitorConsolidado ef={consolidado.ef} novedades={consolidado.novedades} />
      </div>
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
  const [padreInput, setPadreInput] = useState(unidadPadre);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '10px', padding: '16px', maxHeight: '90vh', overflow: 'auto', maxWidth: '90vw' }}>
        <button
          onClick={onClose}
          style={{
            float: 'right',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>REPORTE CONSOLIDADO</h2>

        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={padreInput}
            onChange={(e) => setPadreInput(e.target.value)}
            placeholder="Unidad Superior (Ej. DEPU ARAUCA)"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
        </div>

        <table className="reporte__table" style={{ fontSize: '10px', marginBottom: '16px' }}>
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
            <tr style={{ background: '#e3f2fd' }}>
              <td>T. DISPONIBLE</td>
              <td>{consolidado.ef.of - consolidado.novedades.of}</td>
              <td>{consolidado.ef.sub - consolidado.novedades.sub}</td>
              <td>{consolidado.ef.pt - consolidado.novedades.pt}</td>
              <td>{consolidado.ef.axp - consolidado.novedades.axp}</td>
            </tr>
          </tbody>
        </table>

        {partesHoy.map((parte) => (
          <div key={parte.id} style={{ marginBottom: '16px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
            <h4 style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
              {parte.unidadNombre.toUpperCase()}
            </h4>
            <table style={{ fontSize: '8px', width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>Efectiva</td>
                  <td style={{ border: '1px solid #999', padding: '2px', width: '30px' }}>{parte.ef_of}</td>
                  <td style={{ border: '1px solid #999', padding: '2px', width: '30px' }}>{parte.ef_sub}</td>
                  <td style={{ border: '1px solid #999', padding: '2px', width: '30px' }}>{parte.ef_pt}</td>
                  <td style={{ border: '1px solid #999', padding: '2px', width: '30px' }}>{parte.ef_axp}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>Novedades</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.nov_total_of}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.nov_total_sub}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.nov_total_pt}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.nov_total_axp}</td>
                </tr>
                <tr style={{ background: '#f0f0f0' }}>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>Disponible</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.ef_of - parte.nov_total_of}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.ef_sub - parte.nov_total_sub}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.ef_pt - parte.nov_total_pt}</td>
                  <td style={{ border: '1px solid #999', padding: '2px' }}>{parte.ef_axp - parte.nov_total_axp}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {elaboradoPor && (
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px' }}>
            <div style={{ borderBottom: '1px solid #000', margin: '0 60px 4px' }}>&nbsp;</div>
            <div style={{ fontWeight: 700 }}>{elaboradoPor.toUpperCase()}</div>
            <div style={{ fontSize: '8px' }}>Elabora Parte de Personal</div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '16px',
            fontWeight: 600,
          }}
        >
          CERRAR
        </button>
      </div>
    </div>
  );
}

export default App;
