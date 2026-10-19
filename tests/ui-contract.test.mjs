import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")

test("every native button has an action or submits a handled form", () => {
  const controls = [...source.matchAll(/<button\b[\s\S]*?>/g)].map(
    (match) => match[0],
  )
  const inert = controls.filter(
    (control) =>
      !control.includes("onClick=") && !control.includes('type="submit"'),
  )
  assert.deepEqual(inert, [])
})

test("every design-system button has an action or submit intent", () => {
  const controls = [...source.matchAll(/<Btn\b[\s\S]*?>/g)]
    .map((match) => match[0])
    .filter((control) => !control.includes("function Btn"))
  const inert = controls.filter(
    (control) =>
      !control.includes("onClick=") && !control.includes('type="submit"'),
  )
  assert.deepEqual(inert, [])
})

test("every form has a submit handler", () => {
  const forms = [...source.matchAll(/<form\b[^>]*>/g)].map((match) => match[0])
  assert.equal(forms.length > 0, true)
  assert.deepEqual(
    forms.filter((form) => !form.includes("onSubmit=")),
    [],
  )
})
