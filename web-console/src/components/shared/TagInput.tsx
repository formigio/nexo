import { useState, useRef, useCallback } from 'react'
import type { KeyboardEvent } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...', disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase().slice(0, 50)
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag])
      }
      setInputValue('')
    },
    [tags, onChange],
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index))
    },
    [tags, onChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        if (inputValue.trim()) addTag(inputValue)
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags.length - 1)
      }
    },
    [inputValue, tags, addTag, removeTag],
  )

  return (
    <div
      className={`flex flex-wrap gap-1 min-h-[36px] px-2 py-1 bg-surface-2 border border-border-default rounded focus-within:border-node-screen transition-colors ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-1 border border-border-default text-[11px] text-text-secondary"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(i)
              }}
              className="text-text-dim hover:text-text-primary"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue)
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px] text-text-primary placeholder:text-text-dim py-0.5"
      />
    </div>
  )
}
