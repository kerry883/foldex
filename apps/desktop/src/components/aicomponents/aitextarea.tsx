import { useEditor, EditorContent, ReactRenderer, mergeAttributes,NodeViewWrapper,ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { useEffect, useRef, useState } from 'react'
import { usePromptInputAttachments, usePromptInputController } from '../ai-elements/prompt-input'
import { SuggestionList, type SuggestionItem } from './suggestion-list'
import { Folder, FileText, File } from 'lucide-react'

interface TipTapEditorProps {
  mentionItems: SuggestionItem[]
  promptItems: SuggestionItem[]
  onSubmit: (text: string, mentions: {id: string, label: string, type: string}[]) => void
  onMentionsChange?: (mentions: {id: string, label: string, type: string}[]) => void
  onUpdate?: (text: string) => void;
  disabled?: boolean
  className?: string
  placeholder?: string
}

const MentionPill = (props: any) => {
  const { type, label } = props.node.attrs;

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex items-center gap-0.5   rounded-md text-primary underline underline-offset-2 dark:text-primary  font-medium align-middle mb-0.5 cursor-pointer "
    >
      {/* Render native Lucide icons based on the type! */}
      {type === 'folder' && <Folder size={14} />}
      {type === 'note' && <FileText size={14} />}
      {type === 'file' && <File size={14} />}
      
      <span>{label}</span>
    </NodeViewWrapper>
  );
};

// 1. Premium Pill Extension with Inline Icons
const CustomMention = Mention.extend({
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      type: { default: null },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionPill)
  },
  renderHTML({ node, HTMLAttributes }) {
   

    return [
      'span',
      mergeAttributes({
        'data-type': node.attrs.type,
        'data-id': node.attrs.id
      }, HTMLAttributes),
      `@${node.attrs.label}`
    ]
  }
})

const SlashCommand = Mention.extend({ name: 'slashCommand' })

export function PromptTipTapEditor({ 
  mentionItems, promptItems, onSubmit, onMentionsChange, disabled, className, 
  placeholder = "Ask anything, type @ to tag, / for commands" ,
  onUpdate
}: TipTapEditorProps) {
  
  const controller = usePromptInputController()
  const attachments = usePromptInputAttachments()
  const [isComposing, setIsComposing] = useState(false)
  const isPopupOpen = useRef(false)
  
  const mentionsRef = useRef(mentionItems)
  const promptsRef = useRef(promptItems)
  
  useEffect(() => { mentionsRef.current = mentionItems }, [mentionItems])
  useEffect(() => { promptsRef.current = promptItems }, [promptItems])

  const extractMentions = (json: any) => {
    const extracted: {id: string, label: string, type: string}[] = []
    const traverse = (node: any) => {
      if (node.type === 'mention') {
        extracted.push({ id: node.attrs.id, label: node.attrs.label, type: node.attrs.type })
      }
      if (node.content) node.content.forEach(traverse)
    }
    traverse(json)
    return extracted
  }

  const createSuggestionConfig = (isSlash: boolean) => ({
    items: ({ query }: { query: string }) => {
      const source = isSlash ? promptsRef.current : mentionsRef.current
      return source
        .filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
    },
    
    // MAGIC FIX: Explicitly delete the typed trigger range before inserting
    command: ({ editor, range, props }: any) => {
      if (isSlash) {
        editor.chain().focus().deleteRange(range).insertContent(props.promptText).run()
      } else {
        editor.chain().focus().deleteRange(range).insertContent([
          { type: 'mention', attrs: { id: props.id, label: props.label, type: props.type } },
          { type: 'text', text: ' ' },
        ]).run()
      }
    },
    render: () => {
      let component: ReactRenderer
      let popup: TippyInstance[]

      return {
        onStart: (props: any) => {
          isPopupOpen.current = true
          component = new ReactRenderer(SuggestionList, { props, editor: props.editor })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'top-start',
            offset: [0, 8], // Adds a nice little gap between the cursor and the popover
            theme: 'light',
          })
        },
        onUpdate(props: any) {
          component.updateProps(props)
          if (!props.clientRect) return
          popup[0].setProps({ getReferenceClientRect: props.clientRect })
        },
        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }
          return (component.ref as any)?.onKeyDown(props)
        },
        onExit() {
          isPopupOpen.current = false
          if (popup && popup[0]) popup[0].destroy()
          if (component) component.destroy()
        },
      }
    },
  })

  const editor = useEditor({ 
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: false }),
      Placeholder.configure({ placeholder }),
      CustomMention.configure({
        suggestion: { char: '@', ...createSuggestionConfig(false) }
      }),
      SlashCommand.configure({
        suggestion: { char: '/', ...createSuggestionConfig(true) }
      }),
    ],
    editorProps: {
      attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[44px] max-h-[250px] overflow-y-auto px-4 py-3 text-[15px] leading-relaxed scrollbar-thin',
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && isPopupOpen.current) return false

        if (event.key === "Enter") {
          if (isComposing || event.isComposing) return false
          if (event.shiftKey) return false 

          event.preventDefault()
          const text = view.state.doc.textContent
          const json = view.state.doc.toJSON()
          const mentions = extractMentions(json)

          onSubmit(text, mentions)
          return true
        }

        if (event.key === "Backspace" && view.state.doc.textContent === "" && attachments.files.length > 0) {
          event.preventDefault()
          const lastAttachment = attachments.files.at(-1)
          if (lastAttachment) attachments.remove(lastAttachment.id)
          return true
        }

        return false
      },
    },
    onUpdate: ({ editor }) => {
      controller.textInput.setInput(editor.getText())
      if (onMentionsChange) onMentionsChange(extractMentions(editor.getJSON()))
      onUpdate?.(editor.getText())
    }
  })

  useEffect(() => {
    if (editor && controller.textInput.value === "" && editor.getText() !== "") {
      editor.commands.setContent("")
    }
  }, [controller.textInput.value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  return (
    <div 
      className={`w-full relative ${className}`}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
    >
      <EditorContent editor={editor} className="w-full" />
    </div>
  )
}