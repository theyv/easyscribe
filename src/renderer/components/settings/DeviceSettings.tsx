import { DeviceInfo } from '../common/DeviceInfo'

export function DeviceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Device</h2>
        <p className="text-muted-foreground">
          Manage your device information and sync settings
        </p>
      </div>

      <DeviceInfo />
    </div>
  )
}
