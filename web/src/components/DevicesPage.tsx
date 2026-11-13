import { useCallback, useEffect, useState } from "react";
import { send } from "../bridge";

interface MouseDevice { id: string; name: string }
interface DeviceConfig { dpi: string; pollingRate: string }
type DeviceConfigs = Record<string, DeviceConfig>;
const CONFIG_KEY = "pa-device-configs";
const loadConfigs = (): DeviceConfigs => { try { return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}"); } catch { return {}; } };

export function DevicesPage({ t }: { t: (key: string) => string }) {
  const [devices, setDevices] = useState<MouseDevice[]>([]);
  const [configs, setConfigs] = useState<DeviceConfigs>(loadConfigs);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [saved, setSaved] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setUnavailable(false);
    try { const result = await send<{ devices: MouseDevice[] }>("getMouseDevices"); setDevices(result.devices ?? []); }
    catch { setDevices([]); setUnavailable(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const updateConfig = (deviceId: string, patch: Partial<DeviceConfig>) => {
    setSaved(true);
    setConfigs((current) => {
      const next = { ...current, [deviceId]: { dpi: current[deviceId]?.dpi ?? "", pollingRate: current[deviceId]?.pollingRate ?? "", ...patch } };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next)); return next;
    });
  };

  return (
    <section className="page-shell">
      <header className="page-header"><div><h1 className="page-title">{t("devices")}</h1><p className="page-description">{t("associateCurve")}</p></div><button className="button-glass button-glass--sm" onClick={() => void refresh()} disabled={loading}>{loading ? t("searching") : t("refreshList")}</button></header>
      <div className="device-note"><span className="device-note-icon" aria-hidden="true">i</span><p>{t("mouseReferences")}</p>{saved && <span className="settings-value">{t("deviceSaved")}</span>}</div>
      {loading ? <div className="empty-state"><span className="empty-state-title">{t("lookingForMice")}</span><span>{t("mayTakeSeconds")}</span></div>
        : unavailable ? <div className="empty-state"><span className="empty-state-title">{t("openDesktop")}</span><span>{t("hardwareInDesktop")}</span></div>
          : devices.length === 0 ? <div className="empty-state"><span className="empty-state-title">{t("noMouse")}</span><span>{t("connectAndRefresh")}</span></div>
            : <div className="device-list">{devices.map((device) => {
              const config = configs[device.id] ?? { dpi: "", pollingRate: "" };
              return <article className="device-card" key={device.id}>
                <div className="device-card-heading"><div className="device-glyph" aria-hidden="true">⌖</div><div className="device-heading-copy"><h2>{device.name}</h2></div><span className="device-connected"><i />{t("connected")}</span></div>
                <div className="device-config-grid device-config-grid--two">
                  <label className="device-field"><span>{t("dpi")} <small>{t("reference")}</small></span><input type="number" min="100" max="100000" step="50" value={config.dpi} placeholder={t("notProvided")} onChange={(event) => updateConfig(device.id, { dpi: event.target.value })} /></label>
                  <label className="device-field"><span>{t("pollingRate")} <small>{t("hz")}</small></span><select value={config.pollingRate} onChange={(event) => updateConfig(device.id, { pollingRate: event.target.value })}><option value="">{t("notProvided")}</option>{[125, 250, 500, 1000, 2000, 4000, 8000].map((rate) => <option key={rate} value={rate}>{rate} Hz</option>)}</select></label>
                </div>
              </article>;
            })}</div>}
    </section>
  );
}
