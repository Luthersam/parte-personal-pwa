import { useState } from 'react';
import type { Cuarteto } from '../types';
import { CajaDigito } from './CajaDigito';

interface Props {
  unidadNombre: string;
  elaboradoPor: string;
  ef: Cuarteto;
  comision: Cuarteto;
  excusado: Cuarteto;
  franquicia: Cuarteto;
  permiso: Cuarteto;
  vacaciones: Cuarteto;
  servicios: Cuarteto;
  retardado: Cuarteto;
  horarioFlexible: Cuarteto;
  otros: Cuarteto;
  nombresDict: { [key: string]: string[] };
  onUnidadChange: (value: string) => void;
  onElaboradoPorChange: (value: string) => void;
  onEFChange: (field: keyof Cuarteto, value: number) => void;
  onNovedadChange: (categoria: string, field: keyof Cuarteto, value: number) => void;
  onAddNombre: (categoria: string, nombre: string) => void;
  onRemoveNombre: (categoria: string, index: number) => void;
}

const CATEGORIAS = [
  { id: 'com', label: 'COMISIÓN' },
  { id: 'exc', label: 'EXCUSADO SERVICIO' },
  { id: 'fra', label: 'FRANQUICIA' },
  { id: 'per', label: 'PERMISO' },
  { id: 'vac', label: 'VACACIONES' },
  { id: 'ser', label: 'SERVICIOS' },
  { id: 'ret', label: 'RETARDADO' },
  { id: 'hor', label: 'HORARIO FLEXIBLE' },
  { id: 'otr', label: 'OTROS' },
];

export function FormularioDetallado({
  unidadNombre,
  elaboradoPor,
  ef,
  comision,
  excusado,
  franquicia,
  permiso,
  vacaciones,
  servicios,
  retardado,
  horarioFlexible,
  otros,
  nombresDict,
  onUnidadChange,
  onElaboradoPorChange,
  onEFChange,
  onNovedadChange,
  onAddNombre,
  onRemoveNombre,
}: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [newNombre, setNewNombre] = useState<{ [key: string]: string }>({});

  const cuartetosMap: { [key: string]: Cuarteto } = {
    com: comision,
    exc: excusado,
    fra: franquicia,
    per: permiso,
    vac: vacaciones,
    ser: servicios,
    ret: retardado,
    hor: horarioFlexible,
    otr: otros,
  };

  // Agrega el nombre escrito (si hay). Se usa con "+", Enter y al salir del campo,
  // para no perder un nombre escrito si se guarda sin tocar "+".
  const agregarPendiente = (id: string) => {
    const nombre = (newNombre[id] || '').trim();
    if (!nombre) return;
    onAddNombre(id, nombre);
    setNewNombre((prev) => ({ ...prev, [id]: '' }));
  };

  return (
    <div className="formulario">
      <div>
        <label className="formulario__label" htmlFor="unidad-nombre">
          Nombre de la unidad
        </label>
        <input
          id="unidad-nombre"
          type="text"
          placeholder="Ej. CAI CENTRO"
          autoCapitalize="characters"
          value={unidadNombre}
          onChange={(e) => onUnidadChange(e.target.value)}
          className="formulario__input formulario__input--full"
        />
      </div>

      <section className="formulario__section">
        <div className="formulario__legend formulario__legend--static">1. FUERZA EFECTIVA</div>
        <div className="formulario__grid">
          <CajaDigito label="OF" value={ef.of} onChange={(v) => onEFChange('of', v)} />
          <CajaDigito label="SUB" value={ef.sub} onChange={(v) => onEFChange('sub', v)} />
          <CajaDigito label="PT" value={ef.pt} onChange={(v) => onEFChange('pt', v)} />
          <CajaDigito label="AXP" value={ef.axp} onChange={(v) => onEFChange('axp', v)} />
        </div>
      </section>

      {CATEGORIAS.map(({ id, label }) => {
        const cuarteto = cuartetosMap[id];
        const nombres = nombresDict[id] || [];
        const total = cuarteto.of + cuarteto.sub + cuarteto.pt + cuarteto.axp;
        const faltan = total - nombres.length;
        const abierta = expandedCategory === id;

        return (
          <section key={id} className="formulario__section">
            <button
              type="button"
              aria-expanded={abierta}
              className={`formulario__legend formulario__legend--collapsible${abierta ? ' formulario__legend--open' : ''}`}
              onClick={() => setExpandedCategory(abierta ? null : id)}
            >
              <span>
                {label} ({total})
                {total > 0 && faltan > 0 && (
                  <span className="formulario__legend-extra">
                    Faltan {faltan} {faltan === 1 ? 'nombre' : 'nombres'}
                  </span>
                )}
              </span>
            </button>

            {abierta && (
              <div className="formulario__content">
                <div className="formulario__grid">
                  <CajaDigito
                    label="OF"
                    value={cuarteto.of}
                    onChange={(v) => onNovedadChange(id, 'of', v)}
                    max={ef.of}
                  />
                  <CajaDigito
                    label="SUB"
                    value={cuarteto.sub}
                    onChange={(v) => onNovedadChange(id, 'sub', v)}
                    max={ef.sub}
                  />
                  <CajaDigito
                    label="PT"
                    value={cuarteto.pt}
                    onChange={(v) => onNovedadChange(id, 'pt', v)}
                    max={ef.pt}
                  />
                  <CajaDigito
                    label="AXP"
                    value={cuarteto.axp}
                    onChange={(v) => onNovedadChange(id, 'axp', v)}
                    max={ef.axp}
                  />
                </div>

                {total > 0 && (
                  <div className="formulario__nombres">
                    {nombres.map((nombre, index) => (
                      <div key={index} className="formulario__nombre-item">
                        <input
                          type="text"
                          value={nombre}
                          readOnly
                          aria-label={`Funcionario ${index + 1}`}
                          className="formulario__nombre-input"
                        />
                        <button
                          type="button"
                          aria-label={`Quitar ${nombre}`}
                          onClick={() => onRemoveNombre(id, index)}
                          className="formulario__nombre-btn"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {nombres.length < total && (
                      <div className="formulario__nombre-item">
                        <input
                          type="text"
                          placeholder="Grado y nombre del funcionario"
                          aria-label="Nombre del funcionario"
                          autoCapitalize="characters"
                          value={newNombre[id] || ''}
                          onChange={(e) => setNewNombre({ ...newNombre, [id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') agregarPendiente(id);
                          }}
                          onBlur={() => agregarPendiente(id)}
                          className="formulario__nombre-input"
                        />
                        <button
                          type="button"
                          aria-label="Agregar funcionario"
                          onClick={() => agregarPendiente(id)}
                          className="formulario__nombre-btn formulario__nombre-btn--add"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      <div>
        <label className="formulario__label" htmlFor="elaborado-por">
          Elaborado por
        </label>
        <input
          id="elaborado-por"
          type="text"
          placeholder="Grado y nombres"
          value={elaboradoPor}
          onChange={(e) => onElaboradoPorChange(e.target.value)}
          className="formulario__input formulario__input--full"
        />
      </div>
    </div>
  );
}
