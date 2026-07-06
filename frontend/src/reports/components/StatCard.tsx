interface StatCardProps {
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorStyles: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorStyles[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}
