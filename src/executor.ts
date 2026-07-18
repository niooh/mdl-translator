import vm from 'node:vm'

export function executeScript(body: string): string {
  const transformed = body.replace(/^\s*export\s+default\s+/m, () => '__export_default__ = ')
  const sandbox = { __export_default__: undefined as unknown }
  vm.createContext(sandbox)
  try {
    vm.runInContext(transformed, sandbox, { timeout: 5000 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `[script error: ${msg}]`
  }
  const result = sandbox.__export_default__
  if (result === undefined || result === null) return ''
  return String(result)
}