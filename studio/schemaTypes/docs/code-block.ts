import { CodeBlockIcon } from '@sanity/icons/CodeBlock'
import { defineField, defineType } from 'sanity'

import { previewText } from '../shared/section-preview'
import { DOCS_LIMIT } from './docs-limits'

/** A sample someone is meant to copy.
 *
 *  The one thing a documentation body needs that no other archetype does, and the
 *  reason `docBody` exists as a type of its own rather than reusing `richText`
 *  unchanged. A code sample formatted as a paragraph in monospace is not a code
 *  sample: it loses its line breaks and its leading whitespace, it gets
 *  smart-quoted by the editor, and it cannot be highlighted, labelled or copied
 *  as a unit.
 *
 *  ## No `@sanity/code-input`
 *
 *  Sanity publishes a plugin that puts a real code editor in the Studio, with
 *  syntax highlighting while typing. It was considered and left out: it pulls in
 *  Ace, it owns the shape of the stored value, and `AGENTS.md` asks every
 *  dependency to justify itself. What it buys is highlighting *while editing* —
 *  the published page is highlighted by the frontend either way, from `language`
 *  below. A client whose editors write code all day should add it; that is a
 *  field-level type change on `code` and a migration of existing values, so it is
 *  a decision worth making on evidence rather than in advance.
 *
 *  ## Why `language` is a list and required
 *
 *  It is not styling. It says what the sample *is*, which decides how the
 *  frontend highlights it, what `<code class="language-…">` it emits, and how a
 *  reader knows whether they are looking at a shell command or a config file. A
 *  free-text field here gets "TS", "ts", "Typescript" and "typescirpt" from four
 *  different editors and silently loses highlighting on three of them.
 *
 *  The list is the one thing in this archetype most likely to need extending per
 *  client. Adding an entry is additive and needs no migration.
 *
 *  ## Why `filename` earns a field
 *
 *  "Where does this go?" is the question every code sample raises and most fail
 *  to answer. It is also the accessible name: a code block wide enough to scroll
 *  has to be focusable to be reachable by keyboard (WCAG 2.2 AA — 2.1.1), and a
 *  focusable region with no name is announced as nothing at all. `filename` is
 *  what the frontend labels it with, falling back to the language.
 *
 *  ## Deliberately not modelled
 *
 *  Line highlighting, line-number offsets, collapsed regions, tabbed groups of
 *  samples. All four are presentation dressed as content, all four bind the data
 *  to one build of one component, and all four are the reason documentation
 *  content models become unportable. */
export const codeBlock = defineType({
  name: 'codeBlock',
  title: 'Code',
  type: 'object',
  icon: CodeBlockIcon,
  fields: [
    defineField({
      name: 'language',
      title: 'What is this written in?',
      type: 'string',
      description:
        'Decides how the sample is coloured on the page, and tells the reader what ' +
        'they are looking at. Choose "Plain text" for output, logs, or anything that ' +
        'is not code.',
      options: {
        list: [
          { title: 'Plain text or output', value: 'text' },
          { title: 'Terminal / shell', value: 'bash' },
          { title: 'JSON', value: 'json' },
          { title: 'YAML', value: 'yaml' },
          { title: 'TypeScript', value: 'typescript' },
          { title: 'TypeScript with JSX (.tsx)', value: 'tsx' },
          { title: 'JavaScript', value: 'javascript' },
          { title: 'HTML', value: 'html' },
          { title: 'CSS', value: 'css' },
          { title: 'SQL', value: 'sql' },
          { title: 'GROQ', value: 'groq' },
        ],
      },
      validation: (rule) =>
        rule
          .required()
          .error(
            'Say what this sample is written in. Without it the sample is shown ' +
              'unhighlighted and the reader has to guess whether they are looking at a ' +
              'command to run or a file to save.',
          ),
    }),

    defineField({
      name: 'filename',
      title: 'File or location',
      type: 'string',
      description:
        'Optional, and worth filling in nearly always: where this code goes — ' +
        '"src/app/page.tsx", "package.json", "your terminal". It is shown above the ' +
        'sample, and it is the name a screen reader announces when someone tabs into ' +
        'a sample wide enough to scroll.',
    }),

    defineField({
      name: 'code',
      title: 'Code',
      type: 'text',
      rows: 12,
      description:
        'Paste it exactly as it should be typed, including the indentation. Nothing ' +
        'in here is reformatted or spell-checked. Keep it to the lines that matter — ' +
        'a reader copying a sample cannot tell which parts were essential.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'This code block is empty, so it publishes as a blank grey box. Paste the ' +
              'sample in, or delete the block.',
          ),
        rule
          .custom((code) => {
            if (typeof code !== 'string') return true
            const lines = code.trimEnd().split('\n').length
            if (lines <= DOCS_LIMIT.codeLines) return true
            return (
              `This sample is ${lines} lines. Past about ${DOCS_LIMIT.codeLines} it is a ` +
              'file rather than an example — readers scroll past it, and anyone copying ' +
              'it cannot tell what they were meant to change. Show the part that ' +
              'matters and link to the whole file.'
            )
          })
          .warning(),
      ],
    }),
  ],
  preview: {
    select: {
      filename: 'filename',
      language: 'language',
      code: 'code',
    },
    prepare({ filename, language, code }) {
      const firstLine = typeof code === 'string' ? code.trim().split('\n')[0] : undefined
      return {
        title: previewText(filename) || previewText(firstLine, 60) || 'Empty code block',
        subtitle: language ? `Code · ${language}` : 'Code',
        media: CodeBlockIcon,
      }
    },
  },
})
