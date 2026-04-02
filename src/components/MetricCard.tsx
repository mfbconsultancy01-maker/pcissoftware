interface MetricCardProps {
  title: string
  value: string
  change?: string
  positive?: boolean
  loading?: boolean
}

export default function MetricCard({ title, value, change, positive, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-pcis-card border border-pcis-border rounded-xl p-5">
        <div className="animate-pulse">
          <div className="h-4 bg-pcis-border rounded w-20 mb-3"></div>
          <div className="h-8 bg-pcis-border rounded w-28"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-pcis-card border border-pcis-border rounded-xl p-5">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm text-pcis-text-secondary">{title}</p>
        {change && (
          <span className={`text-xs ${positive ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}
