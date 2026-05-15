import { useEffect } from 'react';

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable === true;
}

/**
 * Combo: 'Ctrl+Enter' | 'Meta+Enter' | 'Escape' | 'Slash' | 'Ctrl+/'
 * Mod = Ctrl (Win/Linux) o Meta/Cmd (Mac).
 *
 * options.allowInInputs: por defecto false. true = el handler corre incluso
 * cuando el foco está en input/textarea (necesario para Ctrl+Enter en form).
 */
export default function useHotkey(combo, handler, options = {}) {
  const { allowInInputs = false, deps = [] } = options;

  useEffect(() => {
    const onKey = (e) => {
      const parts = combo.split('+').map(p => p.trim().toLowerCase());
      const wantsMod = parts.includes('mod') || parts.includes('ctrl') || parts.includes('meta');
      const wantsShift = parts.includes('shift');
      const wantsAlt = parts.includes('alt');
      const key = parts[parts.length - 1];

      const isMod = e.ctrlKey || e.metaKey;
      if (wantsMod !== isMod) return;
      if (wantsShift !== e.shiftKey) return;
      if (wantsAlt !== e.altKey) return;

      const eventKey = (e.key || '').toLowerCase();
      const matchesKey =
        eventKey === key ||
        (key === 'enter' && eventKey === 'enter') ||
        (key === 'escape' && eventKey === 'escape') ||
        (key === 'slash' && eventKey === '/') ||
        (key === 'space' && eventKey === ' ');

      if (!matchesKey) return;

      if (!allowInInputs && isEditableTarget(e.target)) {
        // Slash/escape específicos: dejar pasar Escape siempre desde inputs
        if (key !== 'escape') return;
      }

      handler(e);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, handler, allowInInputs, ...deps]);
}
