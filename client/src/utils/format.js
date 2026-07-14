export function formatPKR(amount) {
  if (amount == null) return '—'
  if (amount >= 10000000) return `PKR ${(amount / 10000000).toFixed(2)} Crore`
  if (amount >= 100000) return `PKR ${(amount / 100000).toFixed(2)} Lakh`
  return `PKR ${amount.toLocaleString('en-PK')}`
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
