<template>
  <div class="email-template-editor">
    <label v-if="label" class="text-caption text-medium-emphasis mb-2 d-inline-block">{{ label }}</label>
    <ClientOnly>
      <div class="editor-shell">
        <div class="editor-toolbar">
          <v-btn size="small" variant="text" :active="editor?.isActive('paragraph')" @click="setParagraph">P</v-btn>
          <v-btn size="small" variant="text" :active="editor?.isActive('heading', { level: 2 })" @click="setHeading(2)">H2</v-btn>
          <v-btn size="small" variant="text" :active="editor?.isActive('heading', { level: 3 })" @click="setHeading(3)">H3</v-btn>
          <v-btn size="small" variant="text" :active="editor?.isActive('heading', { level: 4 })" @click="setHeading(4)">H4</v-btn>
          <v-divider vertical class="mx-1" />
          <v-btn size="small" variant="text" :active="editor?.isActive({ textAlign: 'left' })" icon="mdi-format-align-left" @click="setTextAlign('left')" />
          <v-btn size="small" variant="text" :active="editor?.isActive({ textAlign: 'center' })" icon="mdi-format-align-center" @click="setTextAlign('center')" />
          <v-btn size="small" variant="text" :active="editor?.isActive({ textAlign: 'right' })" icon="mdi-format-align-right" @click="setTextAlign('right')" />
          <v-btn size="small" variant="text" :active="editor?.isActive({ textAlign: 'justify' })" icon="mdi-format-align-justify" @click="setTextAlign('justify')" />
          <v-divider vertical class="mx-1" />
          <v-select
            v-model="fontSize"
            :items="fontSizeItems"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            class="font-size-select"
            @update:model-value="applyFontSize"
          />
          <label class="color-control" title="Text color">
            <v-icon size="16">mdi-format-color-text</v-icon>
            <input v-model="textColor" type="color" @input="applyTextColor">
          </label>
          <span class="text-caption text-medium-emphasis mr-1">Color</span>
          <v-btn size="small" variant="text" icon="mdi-format-color-marker-cancel" @click="clearTextColor" />
          <v-divider vertical class="mx-1" />
          <v-btn size="small" variant="text" :active="editor?.isActive('bold')" icon="mdi-format-bold" @click="run('bold')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('italic')" icon="mdi-format-italic" @click="run('italic')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('underline')" icon="mdi-format-underline" @click="run('underline')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('bulletList')" icon="mdi-format-list-bulleted" @click="run('bullet')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('orderedList')" icon="mdi-format-list-numbered" @click="run('ordered')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('link')" icon="mdi-link-variant" @click="setLink" />
          <v-btn size="small" variant="text" icon="mdi-link-off" @click="unsetLink" />
          <v-divider vertical class="mx-1" />
          <v-btn size="small" variant="text" :active="editor?.isActive('table')" icon="mdi-table-plus" @click="tableAction('insert')" />
          <v-btn size="small" variant="text" icon="mdi-table-row-plus-after" @click="tableAction('addRow')" />
          <v-btn size="small" variant="text" icon="mdi-table-column-plus-after" @click="tableAction('addColumn')" />
          <v-btn size="small" variant="text" icon="mdi-table-row-remove" @click="tableAction('deleteRow')" />
          <v-btn size="small" variant="text" icon="mdi-table-column-remove" @click="tableAction('deleteColumn')" />
          <v-btn size="small" variant="text" icon="mdi-table-remove" @click="tableAction('deleteTable')" />
          <v-spacer />
          <v-btn size="small" variant="text" icon="mdi-code-tags" :active="htmlMode" @click="toggleHtmlMode" />
          <v-btn size="small" variant="text" icon="mdi-undo" @click="run('undo')" />
          <v-btn size="small" variant="text" icon="mdi-redo" @click="run('redo')" />
        </div>
        <div v-if="htmlMode" class="html-mode-wrap">
          <v-textarea
            v-model="htmlDraft"
            label="Raw HTML"
            variant="outlined"
            rows="10"
            hide-details
            @blur="syncHtmlToEditor"
          />
        </div>
        <editor-content v-else :editor="editor" class="editor-content" />
      </div>
      <template #fallback>
        <v-textarea
          :model-value="modelValue ?? ''"
          :label="label"
          :placeholder="placeholder"
          variant="outlined"
          :rows="8"
          @update:model-value="onFallbackChange"
          @focus="onFallbackFocus"
        />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { EditorContent, type Editor, useEditor } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import { Color } from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'

const FontSize = Extension.create<any>({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize)
                return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  placeholder?: string
}>(), {
  modelValue: '',
  label: '',
  placeholder: 'Write email body...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
  focus: []
}>()

const textColor = ref('#0f172a')
const fontSize = ref('14px')
const htmlMode = ref(false)
const htmlDraft = ref('')

const fontSizeItems = [
  { title: '12px', value: '12px' },
  { title: '14px', value: '14px' },
  { title: '16px', value: '16px' },
  { title: '18px', value: '18px' },
  { title: '20px', value: '20px' },
  { title: '24px', value: '24px' },
  { title: '28px', value: '28px' },
  { title: '32px', value: '32px' },
]

const editor = import.meta.client
  ? useEditor({
      content: props.modelValue || '',
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3, 4],
          },
        }),
        TextStyle,
        FontSize,
        Color,
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer nofollow',
            target: '_blank',
          },
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      editorProps: {
        attributes: {
          class: 'editor-input',
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        emit('update:modelValue', html)
        if (htmlMode.value)
          htmlDraft.value = html
      },
      onFocus: () => emit('focus'),
      onBlur: () => emit('blur'),
    })
  : ref<Editor>()

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    const next = value ?? ''
    if (current !== next)
      editor.value.commands.setContent(next, { emitUpdate: false })
    if (htmlMode.value)
      htmlDraft.value = next
  },
)

function run(action: 'bold' | 'italic' | 'underline' | 'bullet' | 'ordered' | 'undo' | 'redo') {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  if (action === 'bold') chain.toggleBold().run()
  else if (action === 'italic') chain.toggleItalic().run()
  else if (action === 'underline') chain.toggleUnderline().run()
  else if (action === 'bullet') chain.toggleBulletList().run()
  else if (action === 'ordered') chain.toggleOrderedList().run()
  else if (action === 'undo') chain.undo().run()
  else if (action === 'redo') chain.redo().run()
}

function setParagraph() {
  editor.value?.chain().focus().setParagraph().run()
}

function setTextAlign(align: 'left' | 'center' | 'right' | 'justify') {
  editor.value?.chain().focus().setTextAlign(align).run()
}

function setHeading(level: 2 | 3 | 4) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function applyFontSize() {
  if (!editor.value) return
  ;(editor.value.chain().focus() as any).setFontSize(fontSize.value).run()
}

function applyTextColor() {
  editor.value?.chain().focus().setColor(textColor.value).run()
}

function clearTextColor() {
  editor.value?.chain().focus().unsetColor().run()
}

function setLink() {
  if (!editor.value) return
  const previous = editor.value.getAttributes('link').href ?? ''
  const url = window.prompt('Enter URL', previous) ?? ''
  const trimmed = url.trim()
  if (!trimmed) return
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
}

function unsetLink() {
  editor.value?.chain().focus().unsetLink().run()
}

function tableAction(action: 'insert' | 'addRow' | 'addColumn' | 'deleteRow' | 'deleteColumn' | 'deleteTable') {
  if (!editor.value) return
  const chain = editor.value.chain().focus()
  if (action === 'insert') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  else if (action === 'addRow') chain.addRowAfter().run()
  else if (action === 'addColumn') chain.addColumnAfter().run()
  else if (action === 'deleteRow') chain.deleteRow().run()
  else if (action === 'deleteColumn') chain.deleteColumn().run()
  else if (action === 'deleteTable') chain.deleteTable().run()
}

function toggleHtmlMode() {
  htmlMode.value = !htmlMode.value
  if (htmlMode.value)
    htmlDraft.value = editor.value?.getHTML() || props.modelValue || ''
  else
    syncHtmlToEditor()
}

function syncHtmlToEditor() {
  if (!editor.value) return
  const next = htmlDraft.value || ''
  editor.value.commands.setContent(next, { emitUpdate: true })
}

function onFallbackChange(value: string) {
  emit('update:modelValue', value)
}

function onFallbackFocus() {
  emit('focus')
}

function insertTokenAtCursor(token: string) {
  if (!token)
    return
  if (editor.value) {
    editor.value.chain().focus().insertContent(token).run()
    return
  }
  const current = props.modelValue ?? ''
  emit('update:modelValue', `${current}${token}`)
}

defineExpose({
  insertTokenAtCursor,
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.editor-shell {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-on-surface), 0.02);
  flex-wrap: wrap;
}

.font-size-select {
  max-width: 88px;
}

.color-control {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.color-control input[type='color'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.html-mode-wrap {
  padding: 12px;
}

.editor-content :deep(.editor-input) {
  min-height: 260px;
  padding: 12px 14px;
  outline: none;
  line-height: 1.5;
}

.editor-content :deep(.editor-input p) {
  margin: 0 0 0.65rem;
}

.editor-content :deep(.editor-input p:last-child) {
  margin-bottom: 0;
}

.editor-content :deep(.editor-input h2),
.editor-content :deep(.editor-input h3),
.editor-content :deep(.editor-input h4) {
  margin: 0.35rem 0 0.7rem;
  line-height: 1.3;
}

.editor-content :deep(.editor-input ul),
.editor-content :deep(.editor-input ol) {
  margin: 0.45rem 0 0.65rem 1.15rem;
}

.editor-content :deep(.editor-input a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.editor-content :deep(.editor-input table) {
  border-collapse: collapse;
  margin: 0.55rem 0;
  width: 100%;
}

.editor-content :deep(.editor-input th),
.editor-content :deep(.editor-input td) {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
  padding: 0.4rem 0.5rem;
  vertical-align: top;
}
</style>
