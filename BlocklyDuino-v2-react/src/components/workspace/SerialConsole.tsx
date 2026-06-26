import { useApp } from '../../context/AppContext';
import './SerialConsole.css';

type Props = {
  height: number;
};

export function SerialConsole({ height }: Props) {
  const { serialOutput } = useApp();

  return (
    <pre className="serial-console" style={{ height }}>
      {serialOutput}
    </pre>
  );
}
