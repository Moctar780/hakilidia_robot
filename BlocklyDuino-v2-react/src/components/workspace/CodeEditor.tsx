import { useApp } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import './CodeEditor.css';

type Props = {
  width: number;
};

export function CodeEditor({ width }: Props) {
  const { generatedCode, setGeneratedCode, codeReadOnly } = useApp();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
  };

  return (
    <div className="code-editor" style={{ width }}>
      <IconButton
        className="code-editor__copy"
        icon={<i className="far fa-copy" aria-hidden />}
        onClick={handleCopy}
      />
      <textarea
        className="code-editor__textarea"
        value={generatedCode}
        readOnly={codeReadOnly}
        onChange={(e) => setGeneratedCode(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
