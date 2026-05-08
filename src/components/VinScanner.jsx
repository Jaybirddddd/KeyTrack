import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, CheckCircle2, AlertCircle, LogIn, LogOut, Car, ArrowLeftRight, Droplets, Fuel, X } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

const LOCATION_OPTIONS = [
  'Key Box',
  'With Service Advisor',
  'With Tech / Bay',
  'With Detail',
  'Manager Office',
  'Other',
];

const ADMIN_REASONS = [
  { label: 'Test Drive', icon: Car, value: 'Test Drive' },
  { label: 'Moving', icon: ArrowLeftRight, value: 'Moving' },
  { label: 'Car Wash', icon: Droplets, value: 'Car Wash' },
  { label: 'Gas', icon: Fuel, value: 'Gas' },
];

export default function VinScanner({ onSuccess, onError }) {
  const { user, displayName } = useCurrentUser();
  const [mode, setMode] = useState('out');
  const [vin, setVin] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isTeamMember = ['detail_team', 'service_team', 'vendor'].includes(user?.role);
  const showReasonButtons = !isTeamMember; // admins, salespersons, porters see reason buttons
  const dispValue = user?.role === 'detail_team' ? 'Detail' : user?.role === 'vendor' ? 'Vendor' : 'Service';

  const handleScan = async (e) => {
    e.preventDefault();
    if (!vin.trim()) return;
    setLoading(true);
    await performScan(vin.trim().toUpperCase());
    setLoading(false);
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);

    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract the VIN (Vehicle Identification Number) from this image. Look for a barcode, QR code, or text showing a VIN number. Return ONLY the 17-character VIN code, nothing else.`,
      file_urls: [uploadResult.file_url],
    });

    const extractedVin = extracted.trim().toUpperCase();
    if (extractedVin.length < 8) {
      setLoading(false);
      setResult({ success: false, message: 'Could not extract VIN from image. Try again.' });
      onError && onError('Could not extract VIN from image.');
      return;
    }

    setVin(extractedVin);
    await performScan(extractedVin);
    setLoading(false);
  };

  const performScan = async (vinToScan) => {
    const allCars = await base44.entities.Car.list(undefined, 500);
    const matchedCar = allCars.find(car =>
      (car.vin && (
        car.vin.toUpperCase() === vinToScan ||
        car.vin.slice(-8).toUpperCase() === vinToScan
      )) ||
      (car.stock_number && car.stock_number.toUpperCase() === vinToScan)
    );

    if (!matchedCar) {
      setResult({ success: false, message: `No vehicle found matching "${vinToScan}". Try VIN or stock number.` });
      onError && onError(`No vehicle found matching "${vinToScan}".`);
      return;
    }

    const personName = displayName || 'Unknown';
    const finalLocation = location === 'Other' ? customLocation : location;

    if (mode === 'out') {
      if (isTeamMember) {
        // Team members: assign to their department
        await base44.entities.Car.update(matchedCar.id, {
          key_holder: personName,
          key_status: 'out',
          disp: dispValue,
          location: finalLocation || '',
        });
        await base44.entities.KeyLog.create({
          car_id: matchedCar.id,
          car_label: `${matchedCar.year} ${matchedCar.make} ${matchedCar.model}`,
          stock_number: matchedCar.stock_number,
          action: 'checked_out',
          person: personName,
          reason: `${dispValue} — ${finalLocation || 'No location specified'}`,
        });
        setResult({
          success: true,
          message: `✓ ${matchedCar.year} ${matchedCar.make} ${matchedCar.model} checked out to ${dispValue}${finalLocation ? ` · ${finalLocation}` : ''}`,
        });
      } else {
        // Admin/sales/porter: just log the key out with reason, no disp change
        await base44.entities.Car.update(matchedCar.id, {
          key_holder: personName,
          key_status: 'out',
        });
        await base44.entities.KeyLog.create({
          car_id: matchedCar.id,
          car_label: `${matchedCar.year} ${matchedCar.make} ${matchedCar.model}`,
          stock_number: matchedCar.stock_number,
          action: 'checked_out',
          person: personName,
          reason: adminReason || 'Key checked out',
        });
        setResult({
          success: true,
          message: `✓ ${matchedCar.year} ${matchedCar.make} ${matchedCar.model} checked out${adminReason ? ` · ${adminReason}` : ''}`,
        });
      }
    } else {
      // Check back in — key returned
      await base44.entities.Car.update(matchedCar.id, {
        key_holder: '',
        key_status: 'in',
        disp: '',
        location: finalLocation || '',
      });

      await base44.entities.KeyLog.create({
        car_id: matchedCar.id,
        car_label: `${matchedCar.year} ${matchedCar.make} ${matchedCar.model}`,
        stock_number: matchedCar.stock_number,
        action: 'checked_in',
        person: personName,
        reason: `Returned by ${personName}${finalLocation ? ` · Left at: ${finalLocation}` : ''}`,
      });

      setResult({
        success: true,
        message: `✓ ${matchedCar.year} ${matchedCar.make} ${matchedCar.model} checked back in${finalLocation ? ` · Left at: ${finalLocation}` : ''}`,
      });
    }

    setVin('');
    setLocation('');
    setCustomLocation('');
    setAdminReason('');
    onSuccess && onSuccess(matchedCar);
    setTimeout(() => setResult(null), 4000);
  };



  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'out' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => { setMode('out'); setResult(null); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Check Out
        </Button>
        <Button
          type="button"
          variant={mode === 'in' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => { setMode('in'); setResult(null); }}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Check Back In
        </Button>
      </div>

      {/* Reason buttons for non-team members (admin, salesperson, porter) */}
      {mode === 'out' && showReasonButtons && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Where is this key going?</p>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_REASONS.map(({ label, icon: Icon, value }) => (
              <Button
                key={value}
                type="button"
                variant={adminReason === value ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setAdminReason(adminReason === value ? '' : value)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {mode === 'out' && isTeamMember && (
        <p className="text-xs text-muted-foreground">Scanning will mark the vehicle as checked out to {dispValue}.</p>
      )}
      {mode === 'in' && (
        <p className="text-xs text-muted-foreground">Scanning will return the key and clear the vehicle's disposition.</p>
      )}

      <form onSubmit={handleScan} className="space-y-3">
        {/* VIN Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan VIN or type stock #..."
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            disabled={loading}
            autoComplete="off"
            className="flex-1"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <Button
            type="button"
            disabled={loading}
            size="sm"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {/* Location — only shown on check back in */}
        {mode === 'in' && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Where are you leaving the key?</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location..." />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {location === 'Other' && (
              <Input
                className="mt-2"
                placeholder="Describe the location..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
              />
            )}
          </div>
        )}

        <Button type="submit" disabled={loading || !vin.trim()} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : mode === 'out' ? (
            <LogOut className="h-4 w-4 mr-2" />
          ) : (
            <LogIn className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Processing...' : mode === 'out' ? 'Check Out Vehicle' : 'Check Back In'}
        </Button>
      </form>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          result.success
            ? 'bg-green-500/15 text-green-500 border border-green-500/30'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <p className="flex-1">{result.message}</p>
          <button onClick={() => setResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}