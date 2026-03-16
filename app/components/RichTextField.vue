<template>
  <div class="rich-text-field">
    <label v-if="label" class="text-caption text-medium-emphasis mb-2 d-inline-block">{{ label }}</label>
    <ClientOnly>
      <div class="rich-editor-shell">
        <div class="rich-toolbar">
          <v-btn size="small" variant="text" :active="editor?.isActive('bold')" icon="mdi-format-bold" @click="run('bold')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('italic')" icon="mdi-format-italic" @click="run('italic')" />
          <v-btn size="small" variant="text" :active="editor?.isActive('underline')" icon="mdi-format-underline" @click="run('underline')" />
          <label class="rich-color-control" title="Text color">
            <v-icon size="16">mdi-format-color-text</v-icon>
            <input v-model="selectedTextColor" type="color" @input="applyTextColor">
          </label>
          <v-btn size="small" variant="text" icon="mdi-format-color-marker-cancel" @click="clearTextColor" />
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
          <v-btn size="small" variant="text" icon="mdi-undo" @click="run('undo')" />
          <v-btn size="small" variant="text" icon="mdi-redo" @click="run('redo')" />
        </div>
        <editor-content :editor="editor" class="rich-editor-content" />
      </div>
      <template #fallback>
        <v-textarea
          :model-value="modelValue ?? ''"
          :label="label"
          :placeholder="placeholder"
          variant="outlined"
          :rows="4"
          @update:model-value="onFallbackChange"
        />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { EditorContent, type Editor, useEditor } from '@tiptap/vue-3'
import { Color } from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  placeholder?: string
}>(), {
  modelValue: '',
  label: '',
  placeholder: 'Write details...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()
const selectedTextColor = ref('#0f172a')

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
        Color,
        Underline,
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
          class: 'rich-editor-input',
        },
      },
      onUpdate: ({ editor }) => {
        emit('update:modelValue', editor.getHTML())
      },
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

function setLink() {
  if (!editor.value) return
  const previous = editor.value.getAttributes('link').href ?? ''
  const url = window.prompt('Enter media/article URL', previous) ?? ''
  const trimmed = url.trim()
  if (!trimmed) return
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
}

function unsetLink() {
  editor.value?.chain().focus().unsetLink().run()
}

function applyTextColor() {
  if (!editor.value) return
  editor.value.chain().focus().setColor(selectedTextColor.value).run()
}

function clearTextColor() {
  editor.value?.chain().focus().unsetColor().run()
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

function onFallbackChange(value: string) {
  emit('update:modelValue', value)
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-editor-shell {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.rich-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.rich-color-control {
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

.rich-color-control input[type='color'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.rich-editor-content :deep(.rich-editor-input) {
  min-height: 128px;
  padding: 10px 12px;
  outline: none;
  line-height: 1.45;
}

.rich-editor-content :deep(.rich-editor-input p) {
  margin: 0 0 0.5rem;
}

.rich-editor-content :deep(.rich-editor-input p:last-child) {
  margin-bottom: 0;
}

.rich-editor-content :deep(.rich-editor-input ul),
.rich-editor-content :deep(.rich-editor-input ol) {
  margin: 0.4rem 0 0.6rem 1.1rem;
}

.rich-editor-content :deep(.rich-editor-input a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.rich-editor-content :deep(.rich-editor-input table) {
  border-collapse: collapse;
  margin: 0.55rem 0;
  width: 100%;
}

.rich-editor-content :deep(.rich-editor-input th),
.rich-editor-content :deep(.rich-editor-input td) {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.24);
  padding: 0.4rem 0.5rem;
  vertical-align: top;
}
</style>
