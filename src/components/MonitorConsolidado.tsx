import type { Cuarteto } from '../types';

interface Props {
  ef: Cuarteto;
  novedades: Cuarteto;
}

export function MonitorConsolidado({ ef, novedades }: Props) {
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
    <div className="monitor--consolidado">
      <div className="monitor__title">CONSOLIDADO DEL DÍA (TODAS LAS UNIDADES)</div>

      <table className="monitor-tabla">
        <thead>
          <tr>
            <th></th>
            <th>EFECTIVA</th>
            <th>FORMANDO</th>
            <th>NOVEDADES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>OF</td>
            <td className="val-ef">{ef.of}</td>
            <td className="val-form">{disponible.of}</td>
            <td className="val-nov">{novedades.of}</td>
          </tr>
          <tr>
            <td>SUB</td>
            <td className="val-ef">{ef.sub}</td>
            <td className="val-form">{disponible.sub}</td>
            <td className="val-nov">{novedades.sub}</td>
          </tr>
          <tr>
            <td>PT</td>
            <td className="val-ef">{ef.pt}</td>
            <td className="val-form">{disponible.pt}</td>
            <td className="val-nov">{novedades.pt}</td>
          </tr>
          <tr>
            <td>AXP</td>
            <td className="val-ef">{ef.axp}</td>
            <td className="val-form">{disponible.axp}</td>
            <td className="val-nov">{novedades.axp}</td>
          </tr>
          <tr className="total-row">
            <td>TOT</td>
            <td className="val-ef">{totalEf}</td>
            <td className="val-form">{totalDisp}</td>
            <td className="val-nov">{totalNov}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
