import { useState } from 'react';
import './styles.css';
import { FormularioDetallado } from './components/FormularioDetallado';
import { MonitorEnVivo } from './components/MonitorEnVivo';
import { useParteStore } from './useParteStore';
import { enviarParte } from './colecta';
import type { ParteGeonumerico } from './types';

// Pantalla que ve una unidad al escanear el QR del coordinador.
export function EnvioUnidad({ peerId, token }: { peerId: string; token: string }) {
  const store = useParteStore();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  const enviar = async () => {
    const totales = store.obtenerTotales();
    const s = store.store;
    if (!s.unidadNombre.trim()) return setError('Ingrese nombre de unidad.');
    if (Object.values(totales.disponible).some((v) => v < 0)) {
      return setError('Las novedades superan la Fuerza Efectiva.');
    }

    const parte: ParteGeonumerico = {
      titulo: 'Diario',
      fecha: new Date(),
      unidadNombre: s.unidadNombre,
      ef_of: s.ef.of,
      ef_sub: s.ef.sub,
      ef_pt: s.ef.pt,
      ef_axp: s.ef.axp,
      nov_total_of: totales.novedades.of,
      nov_total_sub: totales.novedades.sub,
      nov_total_pt: totales.novedades.pt,
      nov_total_axp: totales.novedades.axp,
      elaboradoPor: s.elaboradoPor,
      novedadesJSON: JSON.stringify(store.convertirADict()),
    };

    setError('');
    setEnviando(true);
    setPendiente(false);
    let llego = false;
    try {
      await enviarParte(peerId, token, parte, () => {
        llego = true;
        setPendiente(true);
      });
      setEnviado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(llego ? `El coordinador no aprobó el parte: ${msg}` : msg);
    } finally {
      setEnviando(false);
      setPendiente(false);
    }
  };

  if (enviado) {
    return (
      <div className="app">
        <div className="app__header">
          <h1>PARTE DE PERSONAL</h1>
        </div>
        <div className="app__content" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <h3 style={{ fontSize: 24, margin: '8px 0' }}>Parte enviado</h3>
          <p style={{ fontSize: 17, marginBottom: 20 }}>{store.store.unidadNombre.toUpperCase()} fue aprobado por el coordinador.</p>
          <button className="btn btn--primary" onClick={() => setEnviado(false)}>
            ↻ CORREGIR Y REENVIAR
          </button>
        </div>
      </div>
    );
  }

  const totales = store.obtenerTotales();

  return (
    <div className="app">
      <div className="app__header">
        <h1>PARTE DE PERSONAL</h1>
        <p>Envío a coordinador · Policía Nacional de Colombia</p>
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
          <button onClick={enviar} disabled={enviando} className="btn btn--success">
            {pendiente ? '⏳ ESPERANDO APROBACIÓN...' : enviando ? 'ENVIANDO...' : '📡 ENVIAR AL COORDINADOR'}
          </button>
        </div>
      </div>
    </div>
  );
}
