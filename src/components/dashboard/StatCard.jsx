import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, icon: Icon, accent }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${accent || 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-primary'}`} />
        </div>
      </div>
    </Card>
  );
}