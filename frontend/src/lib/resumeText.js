/**
 * Browser-side text extraction for the offline demo server (the FastAPI backend extracts
 * server-side with pypdf / python-docx). Parsers are loaded on demand to keep the app light.
 */
import { RESUME } from '../engine/constants.js'

export const RESUME_ACCEPT = '.pdf,.docx,.txt'
const ext = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

export function checkResumeFile(file) {
  if (!file) throw new Error('Choose a resume file.')
  if (!['pdf', 'docx', 'txt'].includes(ext(file.name))) throw new Error('Upload a PDF, DOCX or TXT resume.')
  if (!file.size) throw new Error('The file is empty.')
  if (file.size > RESUME.maxBytes) throw new Error('Resume must be 5 MB or smaller.')
}

export async function extractResumeText(file) {
  checkResumeFile(file)
  const kind = ext(file.name)
  try {
    if (kind === 'txt') return await file.text()
    const buf = await file.arrayBuffer()
    if (kind === 'docx') {
      const mammoth = await import('mammoth/mammoth.browser.js')
      return (await mammoth.extractRawText({ arrayBuffer: buf })).value
    }
    const pdfjs = await import('pdfjs-dist')
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      const src = (await import('pdfjs-dist/build/pdf.worker.min.mjs?raw')).default
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' })
    }
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
    const pages = []
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent()
      let line = ''
      const lines = []
      for (const it of c.items) {
        line += it.str
        if (it.hasEOL) { lines.push(line); line = '' }
      }
      if (line) lines.push(line)
      pages.push(lines.join('\n'))
    }
    return pages.join('\n')
  } catch (e) {
    throw new Error(`Could not read ${kind.toUpperCase()} file (${e.message || e.name}).`)
  }
}

export const readAsDataUrl = (file) => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => fail(r.error); r.readAsDataURL(file) })
