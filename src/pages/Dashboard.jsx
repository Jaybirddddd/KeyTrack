import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/dashboard/StatCard';
import RecentKeyActivity from '@/components/dashboard/RecentKeyActivity';
import VehicleInsights from '@/components/dashboard/VehicleInsights';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { Car, KeyRound, DollarSign, AlertTriangle } from 'lucide-react';
import DepartmentQueue from '@/components/dashboard/DepartmentQueue';
import AiAlerts from '@/components/dashboard/AiAlerts';
import GasQueue from '@/components/dashboard/GasQueue';

export default function Dashboard() {
  const { user, isAdmin } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && ['detail_team', 'service_team', 'vendor'].includes(user.role)) {
      navigate('/keys');
    }
  }, [user, navigate]);
  const showInsights = user?.role !== 'vendor' && user?.role !== 'porter';
  const insightsReadOnly = user?.role === 'vendor' || user?.role === 'porter';


  const { data: cars = [] } = useQuery({
    queryKey: ['cars'],
    queryFn: () => base44.entities.Car.list(undefined, 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['keylogs'],
    queryFn: () => base44.entities.KeyLog.list('-created_date', 500),
  });

  const totalCars = cars.length;
  const available = cars.filter((c) => c.status === 'available').length;
  const keysOut = cars.filter((c) => c.key_status === 'out').length;
  const totalValue = cars.reduce((sum, c) => sum + (c.price || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your dealership</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vehicles" value={totalCars} icon={Car} />
        <StatCard title="Available" value={available} icon={Car} accent="bg-green-600" />
        <StatCard title="Keys Out" value={keysOut} icon={KeyRound} accent={keysOut > 0 ? 'bg-destructive' : 'bg-primary/10'} />
        <StatCard title="Total Value" value={`$${totalValue.toLocaleString()}`} icon={DollarSign} accent="bg-secondary" />
      </div>

      {keysOut > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-foreground">{keysOut} key{keysOut > 1 ? 's' : ''} currently checked out</p>
            <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
              {cars.filter((c) => c.key_status === 'out').map((c) => (
                <p key={c.id}>{c.year} {c.make} {c.model} — with {c.key_holder || 'Unknown'}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <GasQueue cars={cars} onUpdated={() => queryClient.invalidateQueries({ queryKey: ['cars'] })} />
      <DepartmentQueue cars={cars} logs={logs} />

      {isAdmin && <AiAlerts cars={cars} logs={logs} />}

      {showInsights && <VehicleInsights cars={cars} readOnly={insightsReadOnly} />}

      <RecentKeyActivity logs={logs} />
    </div>
  );
}