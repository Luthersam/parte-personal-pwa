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
    otr: otros,
  };

  return (
    <div className="formulario">
      <input
        type="text"
        placeholder="NOMBRE UNIDAD (Ej. CAI CENTRO)"
        value={unidadNombre}
        onChange={(e) => onUnidadChange(e.target.value)}
        className="formulario__input formulario__input--full"
      />

      <fieldset className="formulario__section">
        <legend className="formulario__legend">1. FUERZA EFECTIVA</legend>
        <div className="formulario__grid">
          <CajaDigito label="OF" value={ef.of} onChange={(v) => onEFChange('of', v)} />
          <CajaDigito label="SUB" value={ef.sub} onChange={(v) => onEFChange('sub', v)} />
          <CajaDigito label="PT" value={ef.pt} onChange={(v) => onEFChange('pt', v)} />
          <CajaDigito label="AXP" value={ef.axp} onChange={(v) => onEFChange('axp', v)} />
        </div>
      </fieldset>

      <hr className="formulario__divider" />

      {CATEGORIAS.map(({ id, label }) => {
        const cuarteto = cuartetosMap[id];
        const nombres = nombresDict[id] || [];
        const total = cuarteto.of + cuarteto.sub + cuarteto.pt + cuarteto.axp;

        return (
          <fieldset key={id} className="formulario__section">
            <legend
              className="formulario__legend formulario__legend--collapsible"
              onClick={() => setExpandedCategory(expandedCategory === id ? null : id)}
            >
              {label} ({total})
            </legend>

            {expandedCategory === id && (
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
                          className="formulario__nombre-input"
                        />
                        <button
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
                          placeholder="Nombre funcionario"
                          value={newNombre[id] || ''}
                          onChange={(e) => setNewNombre({ ...newNombre, [id]: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newNombre[id]) {
                              onAddNombre(id, newNombre[id]);
                              setNewNombre({ ...newNombre, [id]: '' });
                            }
                          }}
                          className="formulario__nombre-input"
                        />
                        <button
                          onClick={() => {
                            if (newNombre[id]) {
                              onAddNombre(id, newNombre[id]);
                              setNewNombre({ ...newNombre, [id]: '' });
                            }
                          }}
                          className="formulario__nombre-btn"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </fieldset>
        );
      })}

      <hr className="formulario__divider" />

      <input
        type="text"
        placeholder="ELABORADO POR: (Grado y Nombres)"
        value={elaboradoPor}
        onChange={(e) => onElaboradoPorChange(e.target.value)}
        className="formulario__input formulario__input--full"
      />
    </div>
  );
}
