import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CarCard from '@/components/inventory/CarCard';
import CarFormDialog from '@/components/inventory/CarFormDialog';
import KeyActionDialog from '@/components/keys/KeyActionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ClipboardPaste, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PasteSyncDialog from '@/components/inventory/PasteSyncDialog';
import CarInsightDrawer from '@/components/inventory/CarInsightDrawer';
import RepairHistoryDrawer from '@/components/inventory/RepairHistoryDrawer';
import PasteRepairOrderDialog from '@/components/inventory/PasteRepairOrderDialog';
import VinScanner from '@/components/VinScanner';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function Inventory() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useCurrentUser();
  const isTeamMember = ['detail_team', 'service_team', 'vendor'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyFilter, setKeyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [formOpen, setFormOpen] = useState(false);
  const [editCar, setEditCar] = useState(null);
  const [keyDialogCar, setKeyDialogCar] = useState(null);
  const [deleteCar, setDeleteCar] = useState(null);
  const [pasteSyncOpen, setPasteSyncOpen] = useState(false);
  const [repairOrderOpen, setRepairOrderOpen] = useState(false);
  const [insightCar, setInsightCar] = useState(null);
  const [repairCar, setRepairCar] = useState(null);
  const [wipeConfirmStep, setWipeConfirmStep] = useState(0); // 0=idle, 1=first confirm, 2=second confirm
  const [wiping, setWiping] = useState(false);
  const [soldCar, setSoldCar] = useState(null);
  const [markingSold, setMarkingSold] = useState(false);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ['cars'],
    queryFn: () => base44.entities.Car.list('-created_date'),
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: () => base44.entities.CarInsight.list(),
  });

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repair_orders_all'],
    queryFn: () => base44.entities.RepairOrder.list(undefined, 500),
  });

  const carsWithInsights = new Set(insights.map((i) => i.car_id));
  const carsWithRepairs = new Set(repairOrders.map((r) => r.car_id));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['cars'] });
    queryClient.invalidateQueries({ queryKey: ['keylogs'] });
    queryClient.invalidateQueries({ queryKey: ['repair_orders_all'] });
  };

  const handleMarkSold = async () => {
    setMarkingSold(true);
    await base44.entities.Car.update(soldCar.id, { status: 'sold' });
    setMarkingSold(false);
    setSoldCar(null);
    refresh();
  };

  const handleToggleGas = async (car) => {
    await base44.entities.Car.update(car.id, { needs_gas: !car.needs_gas });
    refresh();
  };

  // Show only VinScanner for team members
  if (isTeamMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {user?.role === 'detail_team' ? 'Detail Team' : user?.role === 'vendor' ? 'Vendor' : 'Service Team'}
          </h1>
          <p className="text-muted-foreground mb-6">Scan or type VIN to check in vehicle</p>
          <VinScanner onSuccess={refresh} />
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    const [allLogs, allInsights] = await Promise.all([
      base44.entities.KeyLog.list(undefined, 1000),
      base44.entities.CarInsight.list(undefined, 1000),
    ]);
    const relatedLogs = allLogs.filter(l => l.car_id === deleteCar.id);
    const relatedInsights = allInsights.filter(i => i.car_id === deleteCar.id);
    await Promise.all([
      ...relatedLogs.map(l => base44.entities.KeyLog.delete(l.id)),
      ...relatedInsights.map(i => base44.entities.CarInsight.delete(i.id)),
      base44.entities.Car.delete(deleteCar.id),
    ]);
    setDeleteCar(null);
    refresh();
  };

  const handleWipeAll = async () => {
    setWiping(true);
    let batch = await base44.entities.Car.list(undefined, 50);
    while (batch.length) {
      await Promise.all(batch.map((c) => base44.entities.Car.delete(c.id)));
      batch = await base44.entities.Car.list(undefined, 50);
    }
    setWiping(false);
    setWipeConfirmStep(0);
    refresh();
  };

  const filtered = cars
    .filter((car) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || `${car.year} ${car.make} ${car.model} ${car.stock_number} ${car.vin}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
      const matchesKey = keyFilter === 'all' || car.key_status === keyFilter;
      return matchesSearch && matchesStatus && matchesKey;
    })
    .sort((a, b) => {
      if (sortBy === 'year_desc') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'year_asc') return (a.year || 0) - (b.year || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'make') return (a.make || '').localeCompare(b.make || '');
      if (sortBy === 'age_desc') return (b.age || 0) - (a.age || 0);
      if (sortBy === 'age_asc') return (a.age || 0) - (b.age || 0);
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{cars.length} vehicle{cars.length !== 1 ? 's' : ''} total</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPasteSyncOpen(true)}>
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Paste & Sync
            </Button>
            <Button variant="outline" onClick={() => setRepairOrderOpen(true)}>
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Import Repairs
            </Button>
            <Button onClick={() => { setEditCar(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>

            {/* Wipe All — multi-step confirm */}
            {wipeConfirmStep === 0 && (
              <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setWipeConfirmStep(1)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Wipe All
              </Button>
            )}
            {wipeConfirmStep === 1 && (
              <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/30 rounded-lg px-3 py-1.5">
                <span className="text-sm text-destructive font-medium">Delete all {cars.length} vehicles?</span>
                <Button size="sm" variant="outline" onClick={() => setWipeConfirmStep(0)}>Cancel</Button>
                <Button size="sm" className="bg-destructive hover:bg-destructive/90" onClick={() => setWipeConfirmStep(2)}>Yes, continue</Button>
              </div>
            )}
            {wipeConfirmStep === 2 && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/50 rounded-lg px-3 py-1.5">
                <span className="text-sm text-destructive font-bold">⚠️ Final confirm — this cannot be undone!</span>
                <Button size="sm" variant="outline" onClick={() => setWipeConfirmStep(0)}>Cancel</Button>
                <Button size="sm" className="bg-destructive hover:bg-destructive/90" disabled={wiping} onClick={handleWipeAll}>
                  {wiping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {wiping ? 'Wiping...' : 'Delete Everything'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by year, make, model, stock #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="service">In Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={keyFilter} onValueChange={setKeyFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Keys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Keys</SelectItem>
            <SelectItem value="in">Keys In</SelectItem>
            <SelectItem value="out">Keys Out</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="year_desc">Year (Newest)</SelectItem>
            <SelectItem value="year_asc">Year (Oldest)</SelectItem>
            <SelectItem value="price_desc">Price (High → Low)</SelectItem>
            <SelectItem value="price_asc">Price (Low → High)</SelectItem>
            <SelectItem value="make">Brand (A → Z)</SelectItem>
            <SelectItem value="age_desc">Days in Stock (Most)</SelectItem>
            <SelectItem value="age_asc">Days in Stock (Least)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No vehicles found.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setEditCar(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add your first vehicle
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="w-2 shrink-0" />
            <div className="flex-1">Vehicle</div>
            <div className="hidden md:block w-40 shrink-0">Status</div>
            <div className="w-20 text-right shrink-0">Price</div>
            <div className="w-20 shrink-0" />
          </div>
          {filtered.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              hasInsights={carsWithInsights.has(car.id)}
              hasRepairs={carsWithRepairs.has(car.id)}
              onEdit={isAdmin ? (c) => { setEditCar(c); setFormOpen(true); } : null}
              onDelete={isAdmin ? (c) => setDeleteCar(c) : null}
              onKeyAction={(c) => setKeyDialogCar(c)}
              onInsight={(c) => setInsightCar(c)}
              onRepairs={(c) => setRepairCar(c)}
              onToggleGas={handleToggleGas}
              onMarkSold={!isTeamMember ? (c) => setSoldCar(c) : null}
            />
          ))}
        </div>
      )}

      <PasteSyncDialog open={pasteSyncOpen} onOpenChange={setPasteSyncOpen} onSynced={refresh} />
      <PasteRepairOrderDialog open={repairOrderOpen} onOpenChange={setRepairOrderOpen} cars={cars} onSaved={refresh} />
      <CarInsightDrawer car={insightCar} open={!!insightCar} onOpenChange={(v) => !v && setInsightCar(null)} />
      <RepairHistoryDrawer car={repairCar} open={!!repairCar} onOpenChange={(v) => !v && setRepairCar(null)} />
      <CarFormDialog open={formOpen} onOpenChange={setFormOpen} car={editCar} onSaved={refresh} />
      <KeyActionDialog open={!!keyDialogCar} onOpenChange={(v) => !v && setKeyDialogCar(null)} car={keyDialogCar} onCompleted={refresh} />

      <AlertDialog open={!!soldCar} onOpenChange={(v) => !v && setSoldCar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Sold</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>{soldCar?.year} {soldCar?.make} {soldCar?.model}</strong> (Stock #{soldCar?.stock_number}) as sold?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkSold} disabled={markingSold} className="bg-green-600 hover:bg-green-700">
              {markingSold && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark as Sold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCar} onOpenChange={(v) => !v && setDeleteCar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteCar?.year} {deleteCar?.make} {deleteCar?.model} (Stock #{deleteCar?.stock_number})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}