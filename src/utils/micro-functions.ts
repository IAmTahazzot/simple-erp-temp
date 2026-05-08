export function formatBDT(number: number) {
  // remove decimal
  const intValue = Math.trunc(number)

  // handle negative
  const isNegative = intValue < 0

  // absolute string
  let str = Math.abs(intValue).toString()

  // if <= 3 digits
  if (str.length <= 3) {
    return `${isNegative ? '-' : ''}৳ ${str}`
  }

  // last 3 digits
  const lastThree = str.slice(-3)

  // remaining digits
  let remaining = str.slice(0, -3)

  // add spaces every 2 digits from right
  const parts = []

  while (remaining.length > 2) {
    parts.unshift(remaining.slice(-2))
    remaining = remaining.slice(0, -2)
  }

  if (remaining.length > 0) {
    parts.unshift(remaining)
  }

  const formatted = `${parts.join(' ')} ${lastThree}`

  return `${isNegative ? '-' : ''}৳ ${formatted}`
}

export function formatMoney(value: number | string) {
  const number = Number(value)

  if (isNaN(number)) {
    return '৳ 0'
  }

  const isNegative = number < 0

  // keep decimal if exists
  const [integerPart, decimalPart] = Math.abs(number)
    .toString()
    .split('.')

  // format BD grouping
  let str = integerPart

  if (str.length <= 3) {
    return `৳ ${isNegative ? '-' : ''}${str}${decimalPart ? '.' + decimalPart : ''}`
  }

  const lastThree = str.slice(-3)
  let remaining = str.slice(0, -3)

  const parts = []

  while (remaining.length > 2) {
    parts.unshift(remaining.slice(-2))
    remaining = remaining.slice(0, -2)
  }

  if (remaining.length > 0) {
    parts.unshift(remaining)
  }

  const formattedInt = `${parts.join(' ')} ${lastThree}`

  return `৳ ${isNegative ? '-' : ''}${formattedInt}${
    decimalPart ? '.' + decimalPart : ''
  }`
}
