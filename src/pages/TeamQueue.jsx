import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, Car } from 'lucide-react';
import VinScanner from '@/components/VinScanner';

export default function TeamQueue() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const dept = user?.role === 'detail_team' ? 'Detail' : user?.role === 'vendor' ? 'Vendor' : 'Service';

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ['cars'],
    queryFn: () => base44.entities.Car.list(undefined, 500),
  });

  const myCars = cars.filter((c) => c.disp === dept);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['cars'] });
    queryClient.invalidateQueries({ queryKey: ['keylogs'] });
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{dept} Department</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {myCars.length} vehicle{myCars.length !== 1 ? 's' : ''} currently in your queue
        </p>
      </div>

      {/* Scanner */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Scan Vehicle</h2>
        <VinScanner onSuccess={refresh} />
      </div>

      {/* Queue */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Car className="h-4 w-4" />
          <span className="font-semibold text-sm">Currently With {dept}</span>
          <Badge className="ml-auto bg-muted text-muted-foreground border-border">{myCars.length}</Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : myCars.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No vehicles in your queue.</p>
        ) : (
          <div className="divide-y divide-border">
            {myCars.map((car) => {
              const since = car.updated_date
                ? formatDistanceToNow(new Date(car.updated_date.endsWith('Z') ? car.updated_date : car.updated_date + 'Z'), { addSuffix: false })
                : null;

              return (
                <div key={car.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {car.year} {car.make} {car.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock #{car.stock_number}
                      {car.color ? ` · ${car.color}` : ''}
                      {car.mileage ? ` · ${car.mileage.toLocaleString()} mi` : ''}
                    </p>
                    {car.location && (
                      <p className="text-xs text-muted-foreground">📍 {car.location}</p>
                    )}
                  </div>
                  {since && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {since}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}