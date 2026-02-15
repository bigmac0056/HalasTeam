# Gap Analysis: SmartSphere vs Hackathon Criteria

## 1. Tariffs & Geolocation (`Stage 1`)
| Feature | Current State | Required State | Action |
| :--- | :--- | :--- | :--- |
| **City Support** | Limited (Astana/Almaty mock) | All major KZ cities (Astana, Almaty, Shymkent, etc.) | Expand `tariffs.json` |
| **Geo Logic** | `lat > 48` check | Haversine formula + Distance Threshold | Rewrite `resolveRegion` |
| **Unknown Location** | Defaults to Almaty | Returns `Unknown` + Error | Remove default fallback |
| **API** | `/resolve` exists | `/resolve` + `/supported-cities` | Update/Add endpoints |

## 2. Smart Home Core (`Stage 2`)
| Feature | Current State | Required State | Action |
| :--- | :--- | :--- | :--- |
| **Home Modes** | UI exists, Server stores string | Server applies side-effects (e.g. "Away" -> Lights Off) | Add logic to `settings/mode` |
| **Sensors** | Only `Device` model (status/brightness) | Need numeric info (Temp, Humidity) | **Schema Change**: Add `value` (Float), `unit` (String) to `Device` |
| **Simulation** | None | UI controls to set sensor values | Add Sensor Control Panel to Dashboard |
| **Automation** | Time & Temp (hardcoded) | Sensor-based triggers (Leak, Motion) | Update `automation.js` execution engine |
| **Events** | `automationLog` (msg only) | Structured History (`who`, `what`, `source`) | **Schema Change**: Add `metadata` to `AutomationLog` or parsing |

## 3. Energy Analytics (`Stage 2`)
| Feature | Current State | Required State | Action |
| :--- | :--- | :--- | :--- |
| **Calculation** | Monthly Kwh * Price | Time * Power * Price | Implement `Power` field? Or simulate consumption based on `status=true` duration |
| **Aggregation** | Monthly only | Day/Week/Month | Add aggregation logic |
| **Currency** | Mixed/Fixed | Strict KZT `₸` | Verify all UI components |

## 4. Security & Quality (`Stage 3`)
| Feature | Current State | Required State | Action |
| :--- | :--- | :--- | :--- |
| **Secrets** | `.env` used, but need check | No hardcoded secrets | Scan codebase |
| **IDOR** | Notifications checked by `userId`? | Strict `userId` checks | Audit `routes/notifications.js` |
| **Lint/Build** | Working | Clean run | `npm run lint` pass |

## Implementation Priority
1.  **Tariffs**: Low risk, high value for demo.
2.  **Schema**: `Device.value` (Float), `Device.lastUpdated` (DateTime).
3.  **Modes**: Logic implementation.
4.  **Automation**: Enhance triggers.
