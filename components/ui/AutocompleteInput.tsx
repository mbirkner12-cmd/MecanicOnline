'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface AutocompleteSuggestion {
  label: string;
  secondary?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user picks an item from the list (not just types) */
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  suggestions: AutocompleteSuggestion[];
  placeholder?: string;
  className?: string;
  spellCheck?: boolean;
  autoCorrect?: string;
  autoCapitalize?: string;
  lang?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
  spellCheck,
  autoCorrect,
  autoCapitalize,
  lang,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(s => s.label.toLowerCase().includes(value.toLowerCase().trim()))
    : suggestions;

  const showDropdown = open && filtered.length > 0;

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    setHighlighted(-1);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => updatePosition();

    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  function handleFocus() {
    updatePosition();
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        updatePosition();
        setOpen(true);
        setHighlighted(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && highlighted >= 0) {
      handleSelect(filtered[highlighted]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSelect(s: AutocompleteSuggestion) {
    onChange(s.label);
    onSelect?.(s);
    setOpen(false);
    inputRef.current?.focus();
  }

  const dropdown = showDropdown && typeof document !== 'undefined'
    ? createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          style={dropdownStyle}
          className="max-h-52 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg text-sm"
        >
          {filtered.map((s, i) => (
            <li
              key={s.label}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-3 ${
                i === highlighted ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="truncate">{s.label}</span>
              {s.secondary && (
                <span className="text-xs text-zinc-400 flex-shrink-0">{s.secondary}</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        placeholder={placeholder}
        value={value}
        spellCheck={spellCheck}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        lang={lang}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      {dropdown}
    </>
  );
}
