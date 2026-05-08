import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

const CSV_SCHEMA = {
  type: 'object',
  properties: {
    vehicles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          make: { type: 'string' },
          model: { type: 'string' },
          stockNumber: { type: 'string' },
          vin: { type: 'string' },
          color: { type: 'string' },
          mileage: { type: 'number' },
          price: { type: 'number' },
        },
      },
    },
  },
};

export default function CsvImportDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const runImport = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setStatus('processing');

    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: CSV_SCHEMA,
    });

    if (result.status !== 'success' || !result.output?.vehicles?.length) {
      setError(result.details || 'Could not parse the file. Make sure it has columns for stock number, VIN, year, make, model, mileage, price.');
      setStatus('error');
      return;
    }

    const vehicles = result.output.vehicles;

    // Clear existing + bulk create
    let batch = await base44.entities.Car.list(undefined, 50);
    while (batch.length) {
      await Promise.all(batch.map((c) => base44.entities.Car.delete(c.id)));
      batch = await base44.entities.Car.list(undefined, 50);
    }

    const cars = vehicles.map((v) => ({
      year: v.year || 0,
      make: v.make || '',
      model: v.model || '',
      stock_number: v.stockNumber || '',
      vin: v.vin || '',
      color: v.color || '',
      mileage: v.mileage || 0,
      price: v.price || 0,
      status: 'available',
      key_status: 'in',
    }));

    const batchSize = 25;
    for (let i = 0; i < cars.length; i += batchSize) {
      await base44.entities.Car.bulkCreate(cars.slice(i, i + batchSize));
    }

    setCount(cars.length);
    setStatus('done');
  };

  const handleClose = () => {
    if (status === 'done') onImported();
    onOpenChange(false);
    setFile(null);
    setStatus('idle');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from CSV / Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                Export your inventory from <strong>vAuto</strong> (or any system) as a CSV or Excel file, then upload it here. Current inventory will be replaced.
              </p>
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Expected columns (flexible):</p>
                <p>Stock Number, VIN, Year, Make, Model, Color, Mileage, Price</p>
              </div>
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40'}`}>
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium text-sm">{file.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Click to select a CSV or Excel file</p>
                    </div>
                  )}
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
              </label>
            </>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {status === 'uploading' ? 'Uploading file...' : 'Parsing and saving vehicles...'}
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <p className="text-sm font-medium">Successfully imported {count} vehicles!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Import failed</p>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={runImport} disabled={!file}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </>
          )}
          {(status === 'uploading' || status === 'processing') && (
            <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" />Working...</Button>
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