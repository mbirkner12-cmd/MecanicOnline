'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
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

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase().trim()))
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
    const onScroll = () => setOpen(false);
    const onResize = () => { updatePosition(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

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
      onChange(filtered[highlighted]);
      setOpen(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSelect(s: string) {
    onChange(s);
    setOpen(false);
    inputRef.current?.focus();
  }

  const dropdown = showDropdown && typeof document !== 'undefined'
    ? createPortal(
        <ul
          id={listId}
          role="listbox"
          style={dropdownStyle}
          className="max-h-52 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg text-sm"
        >
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 cursor-pointer truncate ${
                i === highlighted ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {s}
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
