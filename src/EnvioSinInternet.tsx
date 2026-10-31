import { useMemo, useRef, useState } from 'react';
import { FormularioDetallado } from './components/FormularioDetallado';
import { MonitorEnVivo } from './components/MonitorEnVivo';
import { useParteStore } from './useParteStore';
import { codificarMensaje, Ensamblador } from './qrSinInternet';
import { MostrarCodigos } from './MostrarCodigos';
import { ScannerCodigos } from './ScannerCodigos';
import { Icono } from './Icono';
import { useBotonAtras } from './atras';
import type { ParteGeonumerico } from './types';

type Paso = 'formulario' | 'codigos' | 'esperando' | 'enviado';

// Envío de parte sin internet: la unidad muestra códigos QR y luego escanea la confirmación.
export function EnvioSinInternet({ onVolver }: { onVolver: () => void }) {
  const store = useParteStore();
  const [paso, setPaso] = useState<Paso>('formulario');
  const [error, setError] = useState('');
  const [codigos, setCodigos] = useState<string[]>([]);
  const [progreso, setProgreso] = useState('');
  const [unidadEnviada, setUnidadEnviada] = useState('');
  const ensamblador = useRef(new Ensamblador());
  useBotonAtras(() => (paso === 'formulario' ? onVolver() : setPaso('formulario')));

  const parteActual = useMemo<ParteGeonumerico>(() => {
    const totales = store.obtenerTotales();
    const s = store.store;
    return {
      titulo: 'Diario',
      fecha: new Date(),
      unidadNombre: s.unidadNombre.trim(),
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
  }, [store]);

  const generarCodigos = () => {
    const totales = store.obtenerTotales();
    if (!parteActual.unidadNombre) return setError('Ingrese nombre de unidad.');
    if (Object.values(totales.disponible).some((v) => v < 0)) {
      return setError('Las novedades superan la Fuerza Efectiva.');
    }
    setError('');
    setCodigos(codificarMensaje({ tipo: 'parte', parte: parteActual }));
    setPaso('codigos');
  };

  const recibirConfirmacion = (texto: string) => {
    const r = ensamblador.current.agregar(texto);
    if (r.estado === 'parcial') {
      setProgreso(`Confirmación: recibidos ${r.recibidos} de ${r.total}`);
      return;
    }
    if (r.estado === 'error') {
      ensamblador.current.reiniciar();
      setProgreso(r.msg);
      return;
    }
    if (r.estado !== 'completo') return;

    ensamblador.current.reiniciar();
    const valor = r.valor as { tipo?: string; unidad?: string; ok?: boolean; msg?: string };
    if (valor?.tipo !== 'ack') return; // no es la confirmación de este parte
    if ((valor.unidad ?? '').toUpperCase() !== parteActual.unidadNombre.toUpperCase()) {
      setProgreso('Esa confirmación es de otra unidad.');
      return;
    }
    if (valor.ok) {
      setUnidadEnviada(parteActual.unidadNombre);
      setPaso('enviado');
    } else {
      setError(`El coordinador no aprobó el parte: ${valor.msg ?? 'sin motivo indicado.'}`);
      setPaso('formulario');
    }
  };

  if (paso === 'enviado') {
    return (
      <div className="app">
        <div className="app__header">
          <h1>PARTE DE PERSONAL</h1>
          <p>Envío sin internet</p>
        </div>
        <div className="app__content" style={{ textAlign: 'center', paddingTop: 40 }}>
          <Icono nombre="circuloOk" size={72} className="icono--ok" />
          <h3 style={{ fontSize: 24, margin: '8px 0' }}>Parte aprobado</h3>
          <p style={{ fontSize: 17, marginBottom: 20 }}>{unidadEnviada} fue aprobado por el coordinador.</p>
          <button className="btn btn--primary btn--centrado" onClick={onVolver}>
            <Icono nombre="atras" />
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app__header">
        <h1>PARTE DE PERSONAL</h1>
        <p>Envío sin internet</p>
      </div>
      <div className="app__content">
        {paso === 'formulario' && (
          <>
            <MonitorEnVivo ef={store.store.ef} novedades={store.obtenerTotales().novedades} />
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
            <div className="button-group" style={{ gridTemplateColumns: '1fr' }}>
              <button className="btn btn--success" onClick={generarCodigos}>
                <Icono nombre="qr" />
                GENERAR CÓDIGOS PARA EL COORDINADOR
              </button>
            </div>
          </>
        )}

        {paso === 'codigos' && (
          <MostrarCodigos
            titulo="Muestre estos códigos al coordinador"
            instruccion={`Un código por vez. El coordinador los escanea uno tras otro hasta completar ${codigos.length}.`}
            textos={codigos}
            textoFinal="YA LOS MOSTRÉ: ESPERAR CONFIRMACIÓN"
            onFinal={() => {
              setProgreso('');
              ensamblador.current.reiniciar();
              setPaso('esperando');
            }}
          />
        )}

        {paso === 'esperando' && (
          <ScannerCodigos
            titulo="Confirmación del coordinador"
            instruccion="Escanee los códigos que muestra el coordinador."
            progreso={progreso}
            onTexto={recibirConfirmacion}
            onCerrar={() => setPaso('codigos')}
          />
        )}
      </div>
    </div>
  );
}
