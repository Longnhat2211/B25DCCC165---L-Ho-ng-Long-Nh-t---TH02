import { useEffect, useState } from "react";
import { CITIES } from "./cities";
import { describeWeather, fetchWeather, type Unit, type WeatherData } from "./weather";

type FetchState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: WeatherData };
const FAV_KEY = "weather:favorites";
const UNIT_KEY = "weather:unit";

function savedFavorites(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && CITIES.some((city) => city.id === id)) : []; } catch { return []; }
}
function savedUnit(): Unit { try { return localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C"; } catch { return "C"; } }

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [retry, setRetry] = useState(0);
  const [unit, setUnit] = useState<Unit>(savedUnit);
  const [favorites, setFavorites] = useState<string[]>(savedFavorites);
  const [query, setQuery] = useState("");
  const city = CITIES.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    if (!city) { setState({ status: "idle" }); return; }
    const controller = new AbortController(); setState({ status: "loading" });
    fetchWeather(city, controller.signal).then((data) => setState({ status: "success", data })).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: "error", message: error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định." });
    });
    return () => controller.abort();
  }, [city, retry]);
  useEffect(() => { try { localStorage.setItem(UNIT_KEY, unit); } catch { /* local storage may be unavailable */ } }, [unit]);
  useEffect(() => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* local storage may be unavailable */ } }, [favorites]);
  const theme = state.status === "success" ? describeWeather(state.data.current.weatherCode).group : "none";
  const filteredCities = CITIES.filter((item) => item.name.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

  return <div className="app" data-weather={theme}>
    <header className="topbar"><div><p className="eyebrow">DỰ BÁO THỜI TIẾT · VIỆT NAM</p><h1>Thời tiết Việt Nam</h1></div>
      <div className="unit-toggle" role="group" aria-label="Đơn vị nhiệt độ">{(["C", "F"] as Unit[]).map((value) => <button key={value} type="button" className={unit === value ? "is-active" : ""} aria-pressed={unit === value} onClick={() => setUnit(value)}>°{value}</button>)}</div>
    </header>
    <main className="layout">
      <aside className="cities"><div className="city-heading"><div><p className="eyebrow">KHÁM PHÁ</p><h2>Thành phố</h2></div><span className="city-count">08</span></div>
        <label className="search-wrap"><span aria-hidden="true">⌕</span><input className="search" type="search" placeholder="Tìm thành phố..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Tìm thành phố" /></label>
        <ul className="city-list">{filteredCities.map((item) => <li className={`city-item ${item.id === selectedId ? "is-selected" : ""}`} key={item.id}>
          <button className="city-btn" type="button" onClick={() => setSelectedId(item.id)}><span className="city-index">{String(CITIES.indexOf(item) + 1).padStart(2, "0")}</span><span>{item.name}</span>{item.id === selectedId && <span className="selected-dot" />}</button>
          <button className={`fav-btn ${favorites.includes(item.id) ? "is-on" : ""}`} type="button" aria-label={`${favorites.includes(item.id) ? "Bỏ yêu thích" : "Yêu thích"} ${item.name}`} aria-pressed={favorites.includes(item.id)} onClick={() => setFavorites((old) => old.includes(item.id) ? old.filter((id) => id !== item.id) : [...old, item.id])}>{favorites.includes(item.id) ? "★" : "☆"}</button>
        </li>)}</ul>
        <p className="sidebar-note">Dữ liệu dự báo được cập nhật trực tiếp từ Open-Meteo.</p>
      </aside>
      <section className="detail" aria-live="polite">
        {state.status === "idle" && <div className="status empty"><span className="empty-icon">☼</span><p className="eyebrow">BẮT ĐẦU KHÁM PHÁ</p><h2>Chọn một thành phố</h2><p className="muted">Xem thời tiết hiện tại và dự báo 7 ngày.</p></div>}
        {state.status === "loading" && city && <div className="status"><span className="spinner" /><p className="eyebrow">ĐANG TẢI DỮ LIỆU</p><h2>{city.name}</h2><p className="muted">Đang cập nhật dự báo thời tiết...</p></div>}
        {state.status === "error" && <div className="status status-error"><span className="error-icon">!</span><p className="eyebrow">KHÔNG THỂ TẢI DỮ LIỆU</p><h2>Đã có lỗi xảy ra</h2><p className="muted">{state.message}</p><button className="retry-btn" type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại <span aria-hidden="true">↗</span></button></div>}
        {state.status === "success" && city && <WeatherView cityName={city.name} data={state.data} unit={unit} />}
      </section>
    </main>
    <footer className="footer"><span>OPEN-METEO</span><span>Thời tiết cho những hành trình của bạn</span></footer>
  </div>;
}

function WeatherView({ cityName, data, unit }: { cityName: string; data: WeatherData; unit: Unit }) {
  const current = data.current; const description = describeWeather(current.weatherCode);
  const temperature = (value: number) => Math.round(unit === "F" ? value * 9 / 5 + 32 : value);
  const date = new Date(current.time);
  const timeLabel = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
  const dateLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(date).toUpperCase();
  const today = data.daily[0];
  const clock = (value: string) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
  const dayLength = `${Math.floor(today.daylight / 3600)}h ${Math.floor((today.daylight % 3600) / 60)}m`;
  const low = Math.min(...data.daily.map((day) => day.min)); const high = Math.max(...data.daily.map((day) => day.max)); const span = Math.max(1, high - low);
  return <>
    <article className="current"><div className="weather-left"><div className="location-heading"><div><h2 className="current-city"><span className="pin">⌖</span> {cityName}, Việt Nam</h2><p className="date-label">{dateLabel}</p></div><div className="local-clock"><strong>{timeLabel}</strong><span>GIỜ ĐỊA PHƯƠNG</span></div></div>
      <div className="current-main"><span className="current-icon" role="img" aria-label={description.label}>{description.icon}</span><div><p className="current-desc">{description.label}</p><div className="current-temp">{temperature(current.temperature)}<span>°{unit}</span></div><p className="feels-like">Cảm giác như {temperature(current.feelsLike)}°{unit}</p></div></div></div>
      <div className="sun-panel"><div className="sun-pair"><div className="sun-item"><span className="sun-symbol">🌅</span><div><strong>{clock(today.sunrise)}</strong><small>Bình minh</small></div></div><div className="sun-item"><span className="sun-symbol">🌇</span><div><strong>{clock(today.sunset)}</strong><small>Hoàng hôn</small></div></div></div><div className="daylength"><span className="sun-symbol">☼</span><div><strong>{dayLength}</strong><small>Thời lượng ban ngày</small></div></div><div className="stats"><div className="stat"><dt>💧 Xác suất mưa</dt><dd>{today.precipitation}<small>%</small></dd></div><div className="stat"><dt>◌ Độ ẩm</dt><dd>{current.humidity}<small>%</small></dd></div><div className="stat"><dt>≋ Tốc độ gió</dt><dd>{Math.round(current.windSpeed)}<small> km/h</small></dd></div></div></div>
    </article>
    <section className="forecast"><div className="forecast-heading"><div><p className="eyebrow">DỰ BÁO HÀNG NGÀY</p><h2 className="section-title">7 ngày tiếp theo</h2></div><span className="forecast-range">{temperature(low)}° — {temperature(high)}°{unit}</span></div>
      <ul className="forecast-list">{data.daily.map((day, index) => { const condition = describeWeather(day.weatherCode); const left = ((day.min - low) / span) * 100; const width = Math.max(8, ((day.max - day.min) / span) * 100); const dayName = index === 0 ? "Hôm nay" : new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day.date}T12:00:00Z`)); return <li className="forecast-row" key={day.date}><span className="f-day">{dayName}<small>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${day.date}T12:00:00Z`))}</small></span><span className="f-icon" role="img" aria-label={condition.label}>{condition.icon}</span><span className="f-min">{temperature(day.min)}°</span><span className="f-bar"><i className="f-range" style={{ left: `${left}%`, width: `${width}%` }} /></span><span className="f-max">{temperature(day.max)}°</span></li>; })}</ul>
    </section>
  </>;
}
