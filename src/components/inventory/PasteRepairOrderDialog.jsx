import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PasteRepairOrderDialog({ open, onOpenChange, cars, onSaved }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    if (!text.trim()) return;
    setStatus('processing');
    setError('');

    // Build a lookup map from cars by VIN and stock number
    const byVin = {};
    const byStock = {};
    for (const c of cars) {
      if (c.vin) byVin[c.vin.toUpperCase()] = c;
      if (c.stock_number) byStock[c.stock_number.toUpperCase()] = c;
    }

    // Build lookup by last 8 of VIN
    const byLast8Vin = {};
    for (const c of cars) {
      if (c.vin && c.vin.length >= 8) {
        byLast8Vin[c.vin.slice(-8).toUpperCase()] = c;
      }
    }

    // Extract the 8-char VIN suffix from the pasted text in code (reliable, no LLM needed for matching)
    // CDK format: the first line contains something like "PA847066DSDA" or "Repair Order History for PA847066"
    const vinLast8Match = text.match(/\b([A-Z0-9]{8})(?=DSDA|dsda|\s*\n|\s+Repair|\s+repair)/i)
      || text.match(/Repair Order History for\s+([A-Z0-9]{8})/i)
      || text.match(/^([A-Z0-9]{8})/m);
    const vinLast8 = vinLast8Match ? vinLast8Match[1].toUpperCase() : null;

    // Look up matching car by last 8 of VIN in code — exact match, no AI guessing
    const matchedCar = vinLast8 ? (byLast8Vin[vinLast8] || null) : null;
    const matchedCarId = matchedCar?.id || null;

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `You are parsing CDK repair order history text for a car dealership.

Extract every repair order entry from the text. Each entry starts with "DSDA document" followed by a number, then a date.

For each repair order, extract:
- repair_date: the date (MM/DD/YYYY format)
- ro_number: the document number after "DSDA document"
- services_performed: a clear, concise summary of all services/work done (combine all lines/sections A, B, C, etc.)
- total_cost: total dollar amount charged (sum of all line costs as a number — 0 if all were free/warranty/recall)

Repair order text:
${text}`,
      response_json_schema: {
        type: 'object',
        properties: {
          repair_orders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                repair_date: { type: 'string' },
                ro_number: { type: 'string' },
                services_performed: { type: 'string' },
                total_cost: { type: 'number' },
              }
            }
          }
        }
      }
    });

    const orders = (extracted?.repair_orders || []).map(o => ({ ...o, matched_car_id: matchedCarId }));

    if (!orders.length) {
      setError('No repair orders could be extracted from the text. Please check the format and try again.');
      setStatus('error');
      return;
    }

    const matchedOrders = orders.filter(o => o.matched_car_id);
    if (!matchedOrders.length) {
      setError(`Could not match to a vehicle. Detected VIN suffix: "${vinLast8 || 'none found'}". Make sure the CDK repair history text includes the VIN at the top.`);
      setStatus('error');
      return;
    }

    // Look up car details for labels
    const carById = {};
    for (const c of cars) carById[c.id] = c;

    // Fetch existing RO numbers for the matched car to avoid duplicates
    const existingOrders = matchedCarId
      ? await base44.entities.RepairOrder.filter({ car_id: matchedCarId }, undefined, 200)
      : [];
    const existingRoNumbers = new Set(existingOrders.map(o => o.ro_number).filter(Boolean));

    let saved = 0;
    let skipped = 0;
    for (const order of matchedOrders) {
      // Skip if RO number already exists for this car
      if (order.ro_number && existingRoNumbers.has(order.ro_number)) {
        skipped++;
        continue;
      }
      const car = carById[order.matched_car_id];
      await base44.entities.RepairOrder.create({
        car_id: order.matched_car_id,
        stock_number: car?.stock_number || '',
        car_label: car ? `${car.year} ${car.make} ${car.model}` : '',
        repair_date: order.repair_date,
        ro_number: order.ro_number || '',
        services_performed: order.services_performed,
        total_cost: order.total_cost || 0,
      });
      saved++;
    }

    const resultCar = matchedCarId ? carById[matchedCarId] : null;
    setResult({ saved, skipped, total: orders.length, carLabel: resultCar ? `${resultCar.year} ${resultCar.make} ${resultCar.model} (Stock #${resultCar.stock_number})` : null });
    setStatus('done');
    onSaved && onSaved();
  };

  const handleClose = () => {
    onOpenChange(false);
    setText('');
    setStatus('idle');
    setResult(null);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Import Repair Orders
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {status === 'idle' && (
            <>
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">How to use:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open the vehicle's repair history in CDK</li>
                  <li>Select all and copy (Ctrl+A, Ctrl+C)</li>
                  <li>Paste below — the AI will extract and match each repair order automatically</li>
                </ol>
              </div>
              <textarea
                className="w-full h-64 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Paste repair order history here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is extracting repair orders...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex items-start gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Import complete!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.saved} repair order{result.saved !== 1 ? 's' : ''} saved
                  {result.carLabel ? ` to ${result.carLabel}` : ''}.
                  {result.skipped > 0 ? ` (${result.skipped} skipped — already imported)` : ''}
                  {result.total > result.saved + result.skipped ? ` (${result.total - result.saved - result.skipped} could not be matched)` : ''}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 py-4">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Import failed</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleProcess} disabled={!text.trim()}>
                <ClipboardPaste className="h-4 w-4 mr-2" />
                Extract & Import
              </Button>
            </>
          )}
          {status === 'processing' && (
            <Button disabled><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</Button>
          )}
          {(status === 'done' || status === 'error') && (
            <>
              {status === 'error' && <Button variant="outline" onClick={() => setStatus('idle')}>Try Again</Button>}
              <Button onClick={handleClose}>{status === 'done' ? 'Done' : 'Close'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}