# REWE-Bridge

Lokale Schnittstelle, über die die Kochapp eine Einkaufsliste in den Warenkorb auf rewe.de legt.
**Bestellt wird nie automatisch** – am Ende öffnet sich der Warenkorb (`/shop/checkout/basket`), und der
Mensch prüft und bestellt dort selbst.

Keine Installation nötig: Windows PowerShell + Chrome (oder Edge).

## So wird sie benutzt

**Aus der Kochapp (Windows-App):** Im Bereich „Einkaufsliste“ auf
„Bei REWE in den Warenkorb …“ klicken und die Postleitzahl eingeben. Die App startet die Bridge bei Bedarf
selbst (Konsolenfenster + eigenes Chrome-Fenster), wählt den Markt zur Postleitzahl, füllt den Warenkorb und
holt das REWE-Fenster mit dem Warenkorb nach vorn. Der API-Schlüssel wird von der App automatisch gesetzt.

**Aus der Browser-Version:** `start-rewe-bridge.cmd` doppelklicken und den im Konsolenfenster angezeigten
**API key** in der App unter „Bestellen“ → Anbieter „REWE“ eintragen.

Das Chrome-Fenster der Bridge nutzt ein eigenes Profil in `.data/`. Wer sich dort einmal bei REWE anmeldet,
bleibt angemeldet; der Warenkorb gehört zu diesem Fenster. `.data/` enthält Profil und API-Schlüssel und
gehört nicht ins Repository.

## API (`http://localhost:8765`, Header `Authorization: Bearer <API key>`)

| Aufruf | Zweck |
| --- | --- |
| `GET /health` | Erreichbarkeit (ohne Schlüssel) |
| `GET /status` | Markt gewählt? angemeldet? beschäftigt? |
| `POST /market` | Markt setzen: `{ "zipCode": "10115", "service": "DELIVERY" }` (oder `"PICKUP"`, optional `wwIdent`) |
| `POST /orders` | Liste einreichen → `202 { orderId, status: "queued" }` |
| `GET /orders/{orderId}` | Fortschritt und Ergebnis je Artikel |
| `POST /basket/open` | Warenkorb-Fenster nach vorn holen |

```json
POST /orders
{
  "items": [
    { "sku": "reis", "name": "Reis", "quantity": 500, "unit": "g" },
    { "sku": "zwiebel", "name": "Zwiebel", "quantity": 3, "unit": "Stk", "gramsPerUnit": 80 },
    { "name": "Hafermilch", "search": "Oatly Barista", "packages": 2 }
  ],
  "options": { "mode": "set", "openCheckout": true, "background": true }
}
```

- `quantity`/`unit` (g, kg, ml, l, sonst Stück) werden anhand der Packungsgröße in Packungen umgerechnet;
  `packages` gibt die Anzahl direkt vor, `search` den Suchbegriff, `productId` ein festes Produkt.
- `mode: "set"` (Standard) setzt die Menge – erneutes Senden verdoppelt nichts. `"add"` addiert zum Warenkorb.
- Job-Status: `queued`, `running`, `done`, `failed`, `needs_setup` (kein Markt gewählt), `needs_attention`
  (Sicherheitsprüfung von rewe.de – im Browserfenster von Hand bestätigen).
- Feste Zuordnungen pro Lebensmittel: `mappings.json`.

## Hinweise

- rewe.de hat keine öffentliche Schnittstelle. Die Bridge nutzt im eigenen Browserfenster dieselben Aufrufe
  wie der Shop (`rewe-page.js`). Ändert REWE diese, muss dort nachgezogen werden; die Nutzungsbedingungen
  von rewe.de sind zu beachten.
- Gewählt wird der erste lieferbare Suchtreffer – den Warenkorb vor dem Bestellen prüfen.
- Optionen: `start-rewe-bridge.cmd -Port 8765 -DebugPort 9333 -Visible -ChromePath "..."`. Bei anderem Port
  der Windows-App die Adresse über die Umgebungsvariable `REWE_BRIDGE_URL` mitgeben.
