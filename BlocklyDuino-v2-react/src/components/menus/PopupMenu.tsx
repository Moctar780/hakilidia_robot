import type { ReactNode } from 'react';
import './PopupMenu.css';

export type PopupMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  separatorAfter?: boolean;
};

type Props = {
  visible: boolean;
  items: PopupMenuItem[];
  onClose: () => void;
  align?: 'left' | 'center';
};

export function PopupMenu({ visible, items, onClose, align = 'left' }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <div className="popup-overlay" onClick={onClose} role="presentation">
      <div
        className={`popup-menu popup-menu--${align}`}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        {items.map((item) => (
          <div key={item.id}>
            <button
              type="button"
              className="popup-menu__row"
              onClick={() => {
                item.onPress?.();
                onClose();
              }}
            >
              <span className="popup-menu__icon">{item.icon}</span>
              <span className="popup-menu__label">{item.label}</span>
            </button>
            {item.separatorAfter && <hr className="popup-menu__separator" />}
          </div>
        ))}
      </div>
    </div>
  );
}
