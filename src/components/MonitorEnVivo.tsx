import React from 'react';
import { Cuarteto } from '../types';

interface Props {
  ef: Cuarteto;
  novedades: Cuarteto;
}

export function MonitorEnVivo({ ef, novedades }: Props) {
  const disponible = {
    of: ef.of - novedades.of,
    sub: ef.sub - novedades.sub,
    pt: ef.pt - novedades.pt,
    axp: ef.axp - novedades.axp,
  };

  const totalEf = ef.of + ef.sub + ef.pt + ef.axp;
  const totalNov = novedades.of + novedades.sub + novedades.pt + novedades.axp;
  const totalDisp = disponible.of + disponible.sub + disponible.pt + disponible.axp;

  return (
    <div className="monitor monitor--vivo">
      <div className="monitor__title">UNIDAD ACTUAL - EN VIVO</div>

      <div className="monitor__grid">
        <div className="monitor__item">
          <div className="monitor__label">EFECTIVA</div>
          <div className="monitor__value">{totalEf}</div>
        </div>

        <div className="monitor__item">
          <div className="monitor__label">DISPONIBLE</div>
          <div className="monitor__value monitor__value--highlight">{totalDisp}</div>
        </div>

        <div className="monitor__item">
          <div className="monitor__label">NOVEDADES</div>
          <div className="monitor__value monitor__value--warning">{totalNov}</div>
        </div>
      </div>
    </div>
  );
}
