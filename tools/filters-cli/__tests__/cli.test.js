const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

function run(args, env = {}) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  }).trim()
}

const CLI = path.resolve(__dirname, '..', 'index.js')

;(function () {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'notify-cli-'))
  const env = { HOME: tmpHome }

  // list should show no saved filters
  const out1 = run(['list'], env)
  if (!out1.includes('No saved filters')) throw new Error('Expected no saved filters')

  // save a filter
  const query = JSON.stringify({ a: 1 })
  const saveOut = run(['save', '-n', 'TestFilter', '-q', query], env)
  if (!saveOut.startsWith('Saved')) throw new Error('Save failed')
  const id = saveOut.split(' ')[1].trim()

  // list should show the saved filter id
  const listOut = run(['list'], env)
  if (!listOut.includes(id)) throw new Error('List did not include saved id')

  // get should return JSON with the name
  const getOut = run(['get', id], env)
  const obj = JSON.parse(getOut)
  if (obj.name !== 'TestFilter') throw new Error('Get returned wrong object')

  // delete
  const delOut = run(['delete', id], env)
  if (!delOut.includes('Deleted')) throw new Error('Delete failed')

  console.log('OK')
})()
