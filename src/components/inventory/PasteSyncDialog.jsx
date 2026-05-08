import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';

const IGNORED_STOCK_NUMBERS = new Set([
  'P18293', 'P19270', '3531-16B', 'P20113A', 'P20205', 'P20914A', 'P21061',
  '3664-22A', 'P22780', 'P22810A', 'P22941', 'P22955', 'P22966', '2725-25B',
]);

function parseVehicleText(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  const vehicles = [];

  for (const line of lines) {
    const cols = line.split('\t');
    // New format has many leading columns before vehicle data
    // Detect format: if col[8] looks like a year-based vehicle string, it's the new format
    // New format cols: 0=R/B, 1=CarfaxReport, 2=CarfaxRecall, 3=CarfaxWarnings, 4=CarfaxProblems,
    //   5=TradeNetwork, 6=Photos, 7=AutowriterDesc, 8=Vehicle, 9=Stock#, 10=VIN, 11=Class,
    //   12=Certified, 13=DeletedDate, 14=Status, 15=RecallStatus, 16=Age, 17=Body, 18=Color,
    //   19=Disp, 20=Price, 21=DefaultMkt%, 22=LastChange, 23=Book, 24=Cost, 25=Water,
    //   26=Markup, 27=Odometer, ...

    let vehicleStr, stockNumber, vin, age, disp, price, mileage, certified, color, body;

    if (cols.length >= 20 && /^\d{4}\s/.test(cols[8]?.trim())) {
      // New format
      vehicleStr = cols[8]?.trim();
      stockNumber = cols[9]?.trim();
      vin = cols[10]?.trim();
      certified = cols[12]?.trim() === 'Yes';
      age = parseInt(cols[16]?.replace(/,/g, '')) || 0;
      body = cols[17]?.trim();
      color = cols[18]?.trim();
      disp = cols[19]?.trim(); // "Retail" or "Wholesale"
      price = parseFloat(cols[20]?.replace(/[$,]/g, '')) || 0;
      mileage = parseInt(cols[27]?.replace(/,/g, '')) || 0;
    } else if (cols.length >= 3 && /^\d{4}\s/.test(cols[0]?.trim())) {
      // Old format
      vehicleStr = cols[0]?.trim();
      stockNumber = cols[1]?.trim();
      vin = cols[2]?.trim();
      age = parseInt(cols[3]?.replace(/,/g, '')) || 0;
      disp = cols[4]?.trim();
      price = parseFloat(cols[6]?.replace(/[$,]/g, '')) || 0;
    } else {
      continue;
    }

    if (!stockNumber || !vehicleStr) continue;
    if (IGNORED_STOCK_NUMBERS.has(stockNumber)) continue;

    // Parse year make model
    const yearMatch = vehicleStr.match(/^(\d{4})\s+(.+)/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);
    const rest = yearMatch[2];
    const parts = rest.split(' ');
    const make = parts[0];
    const model = parts.slice(1).join(' ');

    const vehicle = {
      year,
      make,
      model,
      stock_number: stockNumber,
      vin: vin || '',
      age,
      price,
      exit_strategy: disp === 'Wholesale' ? 'W' : 'R',
    };

    if (body) vehicle.body = body;
    if (color) vehicle.color = color;
    if (mileage) vehicle.mileage = mileage;
    if (certified !== undefined) vehicle.certified = certified;

    vehicles.push(vehicle);
  }

  return vehicles;
}

export default function PasteSyncDialog({ open, onOpenChange, onSynced }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | syncing | done | error
  const [stats, setStats] = useState({ added: 0, updated: 0, deleted: 0 });
  const [error, setError] = useState('');

  const runSync = async () => {
    const parsed = parseVehicleText(text);
    if (!parsed.length) {
      setError('No vehicles found. Make sure you copied the full table including all columns.');
      setStatus('error');
      return;
    }

    setStatus('syncing');
    setError('');

    // Fetch existing cars
    const existing = await base44.entities.Car.list(undefined, 500);
    const byStock = {};
    for (const c of existing) {
      if (c.stock_number) byStock[c.stock_number] = c;
    }

    let added = 0, updated = 0, deleted = 0;

    const incomingStockNumbers = new Set(parsed.map(v => v.stock_number));

    for (const v of parsed) {
      const existing_car = byStock[v.stock_number];
      if (existing_car) {
        // Update only the "fresh from export" fields, preserve everything else
        await base44.entities.Car.update(existing_car.id, {
          year: v.year,
          make: v.make,
          model: v.model,
          vin: v.vin || existing_car.vin,
          age: v.age,
          price: v.price,
          exit_strategy: v.exit_strategy,
          ...(v.body && { body: v.body }),
          ...(v.color && { color: v.color }),
          ...(v.mileage && { mileage: v.mileage }),
          ...(v.certified !== undefined && { certified: v.certified }),
        });
        updated++;
      } else {
        // New vehicle — create with defaults
        await base44.entities.Car.create({
          ...v,
          status: 'available',
          key_status: 'in',
        });
        added++;
      }
    }

    // Delete vehicles in inventory that are no longer in CDK (also clean up related records)
    const [allLogs, allInsights] = await Promise.all([
      base44.entities.KeyLog.list(undefined, 1000),
      base44.entities.CarInsight.list(undefined, 1000),
    ]);

    for (const existingCar of existing) {
      if (existingCar.stock_number && !incomingStockNumbers.has(existingCar.stock_number)) {
        // Delete related key logs and insights in parallel, then delete the car
        const relatedLogs = allLogs.filter(l => l.car_id === existingCar.id);
        const relatedInsights = allInsights.filter(i => i.car_id === existingCar.id);
        await Promise.all([
          ...relatedLogs.map(l => base44.entities.KeyLog.delete(l.id)),
          ...relatedInsights.map(i => base44.entities.CarInsight.delete(i.id)),
          base44.entities.Car.delete(existingCar.id),
        ]);
        deleted++;
      }
    }

    setStats({ added, updated, deleted });
    setStatus('done');
  };

  const handleClose = () => {
    if (status === 'done') onSynced();
    onOpenChange(false);
    setText('');
    setStatus('idle');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Paste & Sync Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {status === 'idle' && (
            <>
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">How to use:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open your inventory report and select all rows (Ctrl+A)</li>
                  <li>Copy (Ctrl+C)</li>
                  <li>Paste below (Ctrl+V)</li>
                </ol>
                <p className="pt-1">Your existing edits (notes, location, key status, disposition) will be <strong className="text-foreground">preserved</strong>. Only year, make, model, VIN, age, price, and R/W will be updated.</p>
              </div>
              <textarea
                className="w-full h-64 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Paste your inventory data here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {text && (
                <p className="text-xs text-muted-foreground">
                  {parseVehicleText(text).length} vehicles detected
                </p>
              )}
            </>
          )}

          {status === 'syncing' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Syncing inventory...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex items-start gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Sync complete!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.updated} vehicle{stats.updated !== 1 ? 's' : ''} updated · {stats.added} new vehicle{stats.added !== 1 ? 's' : ''} added{stats.deleted > 0 ? ` · ${stats.deleted} removed (not in CDK)` : ''}
                </p>
                <p className="text-xs text-muted-foreground">Your notes, key status, and other edits were preserved.</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 py-4">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Sync failed</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={runSync} disabled={!text.trim()}>
                <ClipboardPaste className="h-4 w-4 mr-2" />
                Sync Inventory
              </Button>
            </>
          )}
          {status === 'syncing' && (
            <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</Button>
          )}
          {(status === 'done' || status === 'error') && (
            <>
              {status === 'error' && <Button variant="outline" onClick={() => setStatus('idle')}>Try Again</Button>}
              <Button onClick={handleClose}>{status === 'done' ? 'View Inventory' : 'Close'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}