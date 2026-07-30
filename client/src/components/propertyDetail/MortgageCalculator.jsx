import { useMemo, useState } from 'react'
import { FiPercent } from 'react-icons/fi'
import { formatPKR } from '../../utils/format'

// Standard amortizing-loan EMI formula - real math, not a bank quote.
// Rates/terms are user-adjustable estimates, clearly labeled as such
// rather than presented as an actual lender's offer.
function calculateEmi(principal, annualRatePercent, years) {
  const monthlyRate = annualRatePercent / 100 / 12
  const months = years * 12
  if (monthlyRate === 0) return principal / months
  const factor = Math.pow(1 + monthlyRate, months)
  return (principal * monthlyRate * factor) / (factor - 1)
}

export default function MortgageCalculator({ price }) {
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [rate, setRate] = useState(14)
  const [years, setYears] = useState(15)

  const { downPayment, principal, emi, totalInterest } = useMemo(() => {
    const dp = (price * downPaymentPct) / 100
    const principalAmt = price - dp
    const monthlyEmi = calculateEmi(principalAmt, rate, years)
    const total = monthlyEmi * years * 12
    return { downPayment: dp, principal: principalAmt, emi: monthlyEmi, totalPayment: total, totalInterest: total - principalAmt }
  }, [price, downPaymentPct, rate, years])

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="mb-1 text-base font-semibold">Mortgage / EMI Calculator</h3>
      <p className="mb-4 text-xs text-gray-400">An estimate based on the numbers below - not a loan offer from any bank.</p>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Down Payment</span>
            <span>{downPaymentPct}% ({formatPKR(downPayment)})</span>
          </div>
          <input type="range" min={0} max={90} value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} className="w-full accent-brand-600" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Interest Rate</span>
            <span className="flex items-center gap-0.5">{rate}% <FiPercent size={10} /></span>
          </div>
          <input type="range" min={1} max={25} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-brand-600" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Loan Term</span>
            <span>{years} years</span>
          </div>
          <input type="range" min={1} max={25} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-brand-600" />
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-brand-50 p-4 text-center dark:bg-brand-950/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Monthly Payment</p>
        <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{formatPKR(emi)}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
          <p className="text-gray-400">Loan Amount</p>
          <p className="font-semibold">{formatPKR(principal)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
          <p className="text-gray-400">Total Interest</p>
          <p className="font-semibold">{formatPKR(totalInterest)}</p>
        </div>
      </div>
    </div>
  )
}
