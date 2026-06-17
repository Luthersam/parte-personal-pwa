import type { Cuarteto } from '../types';

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
    <div className="monitor--vivo">
      <div className="monitor__title">UNIDAD ACTUAL - EN VIVO</div>

      <div className="monitor__grid">
        <div className="monitor__item">
          <div className="monitor__label">EFECTIVA</div>
          <div className="monitor__value">{totalEf}</div>
          <div className="monitor__breakdown">
            OF:{ef.of} SUB:{ef.sub} PT:{ef.pt} AXP:{ef.axp}
          </div>
        </div>

        <div className="monitor__item">
          <div className="monitor__label">FORMANDO</div>
          <div className="monitor__value monitor__value--highlight">{totalDisp}</div>
          <div className="monitor__breakdown">
            OF:{disponible.of} SUB:{disponible.sub} PT:{disponible.pt} AXP:{disponible.axp}
          </div>
        </div>

        <div className="monitor__item">
          <div className="monitor__label">NOVEDADES</div>
          <div className="monitor__value monitor__value--warning">{totalNov}</div>
          <div className="monitor__breakdown">
            OF:{novedades.of} SUB:{novedades.sub} PT:{novedades.pt} AXP:{novedades.axp}
          </div>
        </div>
      </div>
    </div>
  );
}
