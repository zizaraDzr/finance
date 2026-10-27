export function toggleSetMember<T>(values: ReadonlySet<T>, value: T) {
  const nextValues = new Set(values)

  if (nextValues.has(value)) {
    nextValues.delete(value)
  } else {
    nextValues.add(value)
  }

  return nextValues
}
