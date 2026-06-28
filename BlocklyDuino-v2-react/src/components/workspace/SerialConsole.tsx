import { useApp } from '../../context/AppContext';
import './SerialConsole.css';

type Props = {
  height: number;
};

export function SerialConsole({ height }: Props) {
  const { serialOutput, setSerialOutput } = useApp();

  return (
    <section className="serial-console" style={{ height }}>
      <div className="serial-console__header">
        <strong>Console</strong>
        <button type="button" onClick={() => setSerialOutput('')}>
          Effacer
        </button>
      </div>
      <pre className="serial-console__output">{serialOutput}</pre>
    </section>
  );
}
