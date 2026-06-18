# CheckYourWeather

Nowoczesna, responsywna aplikacja pogodowa zbudowana w React i Vite. Dane pogodowe oraz geokodowanie pochodza z bezkluczowego API [Open-Meteo](https://open-meteo.com/).

## Funkcje

- wyszukiwanie miasta przez Open-Meteo Geocoding API,
- aktualna pogoda, temperatura odczuwalna, wiatr, wilgotnosc, cisnienie oraz wschod i zachod slonca,
- prognoza godzinowa i siedmiodniowa,
- opcjonalne uzycie lokalizacji przegladarki,
- responsywny, nowoczesny interfejs typu weather dashboard.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Build produkcyjny

```bash
npm run build
npm start
```

## Railway

Railway moze uzyc domyslnych komend:

- build: `npm run build`
- start: `npm start`

Serwer `server.js` automatycznie czyta `process.env.PORT`, wiec aplikacja powinna dzialac bez dodatkowej konfiguracji portu.
