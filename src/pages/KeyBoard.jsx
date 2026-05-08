import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import KeyActionDialog from '@/components/keys/KeyActionDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyRound, Search, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import VinScanner from '@/components/VinScanner';
import { format } from 'date-fns';

export default function KeyBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('board');
  const [keyDialogCar, setKeyDialogCar] = useState(null);

  const { data: cars = [] } = useQuery({
    queryKey: ['cars'],
    queryFn: () => base44.entities.Car.list('-created_date'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['keylogs'],
    queryFn: () => base44.entities.KeyLog.list('-created_date', 50),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['cars'] });
    queryClient.invalidateQueries({ queryKey: ['keylogs'] });
  };

  const filteredCars = cars.filter((car) => {
    const q = search.toLowerCase();
    return !q || `${car.year} ${car.make} ${car.model} ${car.stock_number}`.toLowerCase().includes(q);
  });

  const keysIn = filteredCars.filter((c) => c.key_status !== 'out');
  const keysOut = filteredCars.filter((c) => c.key_status === 'out');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Key Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all key check-ins and check-outs</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="log">Activity Log</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === 'board' && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Quick VIN Scanner</h2>
          <VinScanner onSuccess={refresh} />
        </div>
      )}

      {tab === 'board' && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keys In */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <h2 className="font-semibold text-foreground">Keys In ({keysIn.length})</h2>
              </div>
              <div className="space-y-2">
                {keysIn.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">All keys are checked out.</p>
                )}
                {keysIn.map((car) => (
                  <Card key={car.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <KeyRound className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{car.year} {car.make} {car.model}</p>
                          <p className="text-xs text-muted-foreground">Stock #{car.stock_number}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setKeyDialogCar(car)}>
                        Check Out
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Keys Out */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <h2 className="font-semibold text-foreground">Keys Out ({keysOut.length})</h2>
              </div>
              <div className="space-y-2">
                {keysOut.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">All keys are in.</p>
                )}
                {keysOut.map((car) => (
                  <Card key={car.id} className="hover:shadow-md transition-shadow border-destructive/20">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <KeyRound className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{car.year} {car.make} {car.model}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock #{car.stock_number} — with <span className="font-medium text-foreground">{car.key_holder}</span>
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setKeyDialogCar(car)}>
                        Check In
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No key activity recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.car_label}</p>
                        <p className="text-xs text-muted-foreground">Stock #{log.stock_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={log.action === 'checked_out' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}>
                        {log.action === 'checked_out' ? (
                          <><ArrowUpFromLine className="h-3 w-3 mr-1" /> Out</>
                        ) : (
                          <><ArrowDownToLine className="h-3 w-3 mr-1" /> In</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{log.person}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.reason || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_date), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <KeyActionDialog open={!!keyDialogCar} onOpenChange={(v) => !v && setKeyDialogCar(null)} car={keyDialogCar} onCompleted={refresh} />
    </div>
  );
}