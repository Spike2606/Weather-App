import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_PLACE = {
  name: "Warszawa",
  country: "Polska",
  admin1: "Wojewodztwo mazowieckie",
  latitude: 52.2297,
  longitude: 21.0122,
};

const WEATHER_CODES = {
  0: ["Slonecznie", "clear"],
  1: ["Prawie bezchmurnie", "clear"],
  2: ["Czesciowe zachmurzenie", "partly"],
  3: ["Pochmurno", "cloudy"],
  45: ["Mgla", "fog"],
  48: ["Szadz", "fog"],
  51: ["Lekka mzawka", "rain"],
  53: ["Mzawka", "rain"],
  55: ["Gesty deszcz mżawkowy", "rain"],
  61: ["Lekki deszcz", "rain"],
  63: ["Deszcz", "rain"],
  65: ["Silny deszcz", "rain"],
  71: ["Lekki snieg", "snow"],
  73: ["Snieg", "snow"],
  75: ["Intensywny snieg", "snow"],
  80: ["Przelotne opady", "rain"],
  81: ["Przelotny deszcz", "rain"],
  82: ["Ulewa", "rain"],
  95: ["Burza", "storm"],
  96: ["Burza z gradem", "storm"],
  99: ["Silna burza z gradem", "storm"],
};

const DAILY_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const HOUR_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
});

function getWeatherInfo(code) {
  return WEATHER_CODES[code] ?? ["Zmienna pogoda", "partly"];
}

function formatPlace(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function WeatherGlyph({ type }) {
  return (
    <span className={`weather-glyph weather-glyph--${type}`} aria-hidden="true">
      <span />
    </span>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function DailyForecast({ day }) {
  const [label, type] = getWeatherInfo(day.weatherCode);

  return (
    <article className="daily-card">
      <div>
        <span>{DAILY_FORMAT.format(new Date(day.time))}</span>
        <strong>{label}</strong>
      </div>
      <WeatherGlyph type={type} />
      <p>
        {Math.round(day.max)}&deg; / {Math.round(day.min)}&deg;
      </p>
    </article>
  );
}

function HourlyForecast({ hour }) {
  const [, type] = getWeatherInfo(hour.weatherCode);

  return (
    <article className="hour-card">
      <span>{HOUR_FORMAT.format(new Date(hour.time))}</span>
      <WeatherGlyph type={type} />
      <strong>{Math.round(hour.temperature)}&deg;</strong>
      <small>{Math.round(hour.precipitation)}%</small>
    </article>
  );
}

export default function App() {
  const [query, setQuery] = useState("Warszawa");
  const [place, setPlace] = useState(DEFAULT_PLACE);
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const currentInfo = useMemo(() => {
    if (!weather?.current) {
      return ["Ladowanie prognozy", "partly"];
    }

    return getWeatherInfo(weather.current.weather_code);
  }, [weather]);

  const hourlyForecast = useMemo(() => {
    if (!weather?.hourly) {
      return [];
    }

    const now = Date.now();
    const nextHours = weather.hourly.time
      .map((time, index) => ({
        time,
        temperature: weather.hourly.temperature_2m[index],
        precipitation: weather.hourly.precipitation_probability[index],
        weatherCode: weather.hourly.weather_code[index],
      }))
      .filter((hour) => new Date(hour.time).getTime() >= now - 60 * 60 * 1000)
      .slice(0, 12);

    return nextHours;
  }, [weather]);

  const dailyForecast = useMemo(() => {
    if (!weather?.daily) {
      return [];
    }

    return weather.daily.time.map((time, index) => ({
      time,
      max: weather.daily.temperature_2m_max[index],
      min: weather.daily.temperature_2m_min[index],
      weatherCode: weather.daily.weather_code[index],
    }));
  }, [weather]);

  useEffect(() => {
    fetchWeather(DEFAULT_PLACE);
  }, []);

  async function fetchWeather(nextPlace) {
    setStatus("loading");
    setError("");

    const timezone = encodeURIComponent(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
    );

    const params = new URLSearchParams({
      latitude: nextPlace.latitude,
      longitude: nextPlace.longitude,
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,pressure_msl",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      forecast_days: "7",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}&timezone=${timezone}`,
    );

    if (!response.ok) {
      throw new Error("Nie udalo sie pobrac prognozy pogody.");
    }

    const data = await response.json();
    setWeather(data);
    setPlace(nextPlace);
    setStatus("ready");
  }

  async function handleSearch(event) {
    event.preventDefault();

    const city = query.trim();
    if (!city) {
      setError("Wpisz nazwe miasta.");
      return;
    }

    try {
      setStatus("loading");
      setError("");

      const geoParams = new URLSearchParams({
        name: city,
        count: "1",
        language: "pl",
        format: "json",
      });

      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`,
      );

      if (!geoResponse.ok) {
        throw new Error("Nie udalo sie wyszukac lokalizacji.");
      }

      const geoData = await geoResponse.json();
      const result = geoData.results?.[0];

      if (!result) {
        throw new Error("Nie znaleziono takiej lokalizacji. Sprobuj wpisac inne miasto.");
      }

      await fetchWeather(result);
    } catch (searchError) {
      setStatus("error");
      setError(searchError.message);
    }
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Twoja przegladarka nie wspiera geolokalizacji.");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetchWeather({
            name: "Twoja lokalizacja",
            country: "",
            admin1: "",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        } catch (locationError) {
          setStatus("error");
          setError(locationError.message);
        }
      },
      () => {
        setStatus("error");
        setError("Nie udalo sie uzyskac dostepu do lokalizacji.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const current = weather?.current;
  const sunrise = weather?.daily?.sunrise?.[0]
    ? HOUR_FORMAT.format(new Date(weather.daily.sunrise[0]))
    : "--";
  const sunset = weather?.daily?.sunset?.[0]
    ? HOUR_FORMAT.format(new Date(weather.daily.sunset[0]))
    : "--";

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">CheckYourWeather</p>
          <h1>Pogoda, ktora wyglada tak dobrze jak dziala.</h1>

          <form className="search-card" onSubmit={handleSearch}>
            <label htmlFor="city">Sprawdz miasto</label>
            <div>
              <input
                id="city"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="np. Krakow, Gdansk, Berlin"
                autoComplete="off"
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Szukam..." : "Pokaz pogode"}
              </button>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={handleUseLocation}
              disabled={status === "loading"}
            >
              Uzyj mojej lokalizacji
            </button>
          </form>

          {error && <p className="error-message">{error}</p>}
        </div>

        <aside className="current-weather-card" aria-live="polite">
          <div className="card-glow" />
          <div className="current-weather-card__top">
            <div>
              <span>Teraz</span>
              <h2>{formatPlace(place)}</h2>
            </div>
            <WeatherGlyph type={currentInfo[1]} />
          </div>

          <div className="temperature-row">
            <strong>{current ? Math.round(current.temperature_2m) : "--"}&deg;</strong>
            <div>
              <span>{currentInfo[0]}</span>
              <small>
                Odczuwalnie{" "}
                {current ? `${Math.round(current.apparent_temperature)}°C` : "--"}
              </small>
            </div>
          </div>

          <div className="metric-grid">
            <StatCard
              label="Wiatr"
              value={current ? `${Math.round(current.wind_speed_10m)} km/h` : "--"}
              detail="na wysokosci 10 m"
            />
            <StatCard
              label="Wilgotnosc"
              value={current ? `${current.relative_humidity_2m}%` : "--"}
              detail="powietrza"
            />
            <StatCard
              label="Cisnienie"
              value={current ? `${Math.round(current.pressure_msl)} hPa` : "--"}
              detail="MSL"
            />
            <StatCard label="Slonce" value={`${sunrise} - ${sunset}`} detail="wschod / zachod" />
          </div>
        </aside>
      </section>

      <section className="forecast-layout">
        <div className="panel panel--wide">
          <div className="panel__header">
            <div>
              <span>Najblizsze godziny</span>
              <h2>Prognoza godzinowa</h2>
            </div>
            <p>Szansa opadow widoczna pod temperatura.</p>
          </div>

          <div className="hourly-strip">
            {hourlyForecast.map((hour) => (
              <HourlyForecast key={hour.time} hour={hour} />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <div>
              <span>7 dni</span>
              <h2>Nadchodzacy tydzien</h2>
            </div>
          </div>

          <div className="daily-list">
            {dailyForecast.map((day) => (
              <DailyForecast key={day.time} day={day} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
