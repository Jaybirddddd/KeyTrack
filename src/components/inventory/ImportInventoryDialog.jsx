import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const BASE_URL = 'https://www.bettenimports.com/apis/widget/INVENTORY_LISTING_DEFAULT_AUTO_USED:inventory-data-bus1/getInventory?sortBy=internetPrice+asc&languageContext=en';

const PAGE_SCHEMA = {
  type: 'object',
  properties: {
    totalCount: { type: 'number' },
    vehicles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          make: { type: 'string' },
          model: { type: 'string' },
          trim: { type: 'string' },
          stockNumber: { type: 'string' },
          vin: { type: 'string' },
          exteriorColor: { type: 'string' },
          odometer: { type: 'number' },
          askingPrice: { type: 'number' },
          imageUri: { type: 'string' },
        }
      }
    }
  }
};

export default function ImportInventoryDialog({ open, onOpenChange, onImported }) {
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    setLog([]);
    setProgress(0);
    setImportedCount(0);

    // Fetch page 0 to learn totalCount
    addLog('Fetching page 1...');
    const page0 = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Fetch this URL and extract the inventory data from the JSON response:
${BASE_URL}&start=0&numRecords=18

From pageInfo, extract:
- totalCount (integer)
For each item in pageInfo.trackingData extract:
- year (use modelYear field)
- make
- model
- trim
- stockNumber
- vin
- exteriorColor
- odometer (integer)
- askingPrice (parse to float, remove $ and commas)
- imageUri (use images[0].uri)

Return all vehicles and totalCount.`,
      response_json_schema: PAGE_SCHEMA,
    });

    const totalCount = page0?.totalCount || 0;
    const firstBatch = page0?.vehicles || [];

    if (!firstBatch.length) {
      addLog('ERROR: No vehicles returned.');
      setStatus('error');
      return;
    }

    addLog(`Page 1: ${firstBatch.length} vehicles. Total: ${totalCount}`);
    setProgress(15);

    // Fetch remaining pages sequentially
    const pageSize = 18;
    const totalPages = Math.ceil(totalCount / pageSize);
    let allVehicles = [...firstBatch];

    for (let page = 1; page < totalPages; page++) {
      const start = page * pageSize;
      addLog(`Fetching page ${page + 1} of ${totalPages}...`);
      const result = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt: `Fetch this URL and extract inventory data from the JSON response:
${BASE_URL}&start=${start}&numRecords=${pageSize}

For each item in pageInfo.trackingData extract:
- year (use modelYear field)
- make
- model
- trim
- stockNumber
- vin
- exteriorColor
- odometer (integer)
- askingPrice (parse to float, remove $ and commas)
- imageUri (use images[0].uri)

Return all vehicles found.`,
        response_json_schema: PAGE_SCHEMA,
      });
      allVehicles = [...allVehicles, ...(result?.vehicles || [])];
      setProgress(Math.round(15 + (page / totalPages) * 35));
    }

    addLog(`Fetched ${allVehicles.length} total vehicles.`);
    setProgress(50);

    // Map to Car entity shape
    const seen = new Set();
    const cars = allVehicles
      .filter((v) => {
        if (!v.stockNumber || seen.has(v.stockNumber)) return false;
        seen.add(v.stockNumber);
        return true;
      })
      .map((v) => ({
        year: v.year || 0,
        make: v.make || '',
        model: [v.model, v.trim].filter(Boolean).join(' ').trim(),
        stock_number: v.stockNumber || '',
        vin: v.vin || '',
        color: v.exteriorColor || '',
        mileage: v.odometer || 0,
        price: v.askingPrice || 0,
        image_url: v.imageUri || '',
        status: 'available',
        key_status: 'in',
      }));

    addLog(`${cars.length} unique vehicles ready to save.`);

    // Clear old inventory
    addLog('Clearing old inventory...');
    let page = 0;
    while (true) {
      const batch = await base44.entities.Car.list(undefined, 50);
      if (!batch.length) break;
      await Promise.all(batch.map((c) => base44.entities.Car.delete(c.id)));
      page++;
      if (page > 20) break; // safety
    }
    setProgress(60);

    // Bulk create in batches of 25
    setStatus('saving');
    addLog(`Saving ${cars.length} vehicles...`);
    const batchSize = 25;
    let count = 0;
    for (let i = 0; i < cars.length; i += batchSize) {
      await base44.entities.Car.bulkCreate(cars.slice(i, i + batchSize));
      count += Math.min(batchSize, cars.length - i);
      setImportedCount(count);
      setProgress(60 + Math.round((count / cars.length) * 40));
    }

    setProgress(100);
    setStatus('done');
    addLog(`✓ Done! ${count} vehicles imported.`);
  };

  const handleClose = () => {
    if (status === 'done') onImported();
    onOpenChange(false);
    setStatus('idle');
    setLog([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import from Betten Imports Website
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {status === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Imports all pre-owned vehicles from <span className="font-medium text-foreground">Betten Imports</span> — photos, prices, mileage, VINs, and stock numbers. Current inventory will be replaced.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⏱ Takes about 2–3 minutes to fetch all pages. Don't close this dialog.
              </div>
            </div>
          )}

          {(status === 'running' || status === 'saving') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {status === 'saving' ? `Saving vehicles (${importedCount} done)...` : 'Fetching from Betten Imports...'}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {status === 'done' && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Successfully imported {importedCount} vehicles!
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-5 w-5" />
              Something went wrong. See log below.
            </div>
          )}

          {log.length > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
              {log.map((entry, i) => (
                <p key={i} className="text-muted-foreground">{entry}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={runImport}>
                <Download className="h-4 w-4 mr-2" />
                Start Import
              </Button>
            </>
          )}
          {(status === 'running' || status === 'saving') && (
            <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" />Working...</Button>
          )}
          {(status === 'done' || status === 'error') && (
            <>
              {status === 'error' && (
                <Button variant="outline" onClick={runImport}>
                  <RefreshCw className="h-4 w-4 mr-2" />Retry
                </Button>
              )}
              <Button onClick={handleClose}>{status === 'done' ? 'View Inventory' : 'Close'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}