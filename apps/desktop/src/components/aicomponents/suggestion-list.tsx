import { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react'
import { Folder, Notebook, FileIcon, Sparkles, Command } from 'lucide-react'

export type SuggestionItem = {
  id: string
  label: string
  type: 'folder' | 'note' | 'file' | 'prompt'
  promptText?: string 
  description?: string
}

export const SuggestionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) props.command(item)
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  // MAGIC SCROLL FIX: Keeps the selected item in view when using arrow keys
  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedEl = scrollContainerRef.current.children[selectedIndex] as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  const getIcon = (type: string) => {
    switch (type) {
      case 'folder': return <Folder className="w-4 h-4 text-primary" />
      case 'note': return <Notebook className="w-4 h-4 text-primary" />
      case 'file': return <FileIcon className="w-4 h-4 text-primary" />
      case 'prompt': return <Sparkles className="w-4 h-4 text-primary" />
      default: return <Command className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <div className="z-50 w-80 rounded-xl border border-border/50 bg-background shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
      {props.items.length > 0 ? (
        <div ref={scrollContainerRef} className="max-h-[280px] overflow-y-auto p-1.5 scrollbar-thin">
          {props.items.map((item: SuggestionItem, index: number) => (
            <button
              key={index}
              className={`flex w-full items-start gap-3 text-left cursor-pointer p-2 rounded-lg transition-colors ${
                index === selectedIndex ? 'bg-muted/80' : 'hover:bg-muted/50'
              }`}
              onClick={() => selectItem(index)}
            >
              <div className="mt-0.5 shrink-0">
                {getIcon(item.type)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                {item.description && (
                  <span className="truncate text-xs text-muted-foreground mt-0.5">{item.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  )
})

SuggestionList.displayName = 'SuggestionList'