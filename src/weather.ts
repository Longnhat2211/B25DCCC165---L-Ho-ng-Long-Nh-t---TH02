import type { City } from "./cities";

export type Unit = "C" | "F";
export type CurrentWeather = { temperature: number; feelsLike: number; humidity: number; windSpeed: number; weatherCode: number; time: string };
export type DailyWeather = { date: string; weatherCode: number; min: number; max: number; sunrise: string; sunset: string; daylight: number; precipitation: number };
export type WeatherData = { current: CurrentWeather; daily: DailyWeather[] };
export function describeWeather(code: number): { label: string; icon: string; group: string } {
  if (code === 0) return { label: "Trời quang", icon: "☀️", group: "clear" };
  if ([1, 2].includes(code)) return { label: code === 1 ? "Ít mây" : "Có mây", icon: "🌤️", group: "cloud" };
  if (code === 3) return { label: "Nhiều mây", icon: "☁️", group: "cloud" };
  if ([45, 48].includes(code)) return { label: "Sương mù", icon: "🌫️", group: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Mưa phùn", icon: "🌦️", group: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Có mưa", icon: "🌧️", group: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Có tuyết", icon: "❄️", group: "snow" };
  if ([95, 96, 99].includes(code)) return { label: "Dông", icon: "⛈️", group: "storm" };
  return { label: "Thời tiết thay đổi", icon: "🌤️", group: "cloud" };
}

type ApiResponse = {
  current?: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; time: string };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_min: number[]; temperature_2m_max: number[]; sunrise: string[]; sunset: string[]; daylight_duration: number[]; precipitation_probability_max: number[] };
  error?: boolean; reason?: string;
};
export async function fetchWeather(city: City, signal: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,precipitation_probability_max", timezone: "Asia/Ho_Chi_Minh", forecast_days: "7" });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error(response.status === 429 ? "Dịch vụ đang quá tải. Vui lòng thử lại sau." : "Không thể kết nối tới Open-Meteo. Hãy kiểm tra mạng rồi thử lại.");
  const json = await response.json() as ApiResponse;
  if (json.error || !json.current || !json.daily) throw new Error(json.reason ?? "Dữ liệu thời tiết trả về không hợp lệ.");
  const { current, daily } = json;
  return {
    current: { temperature: current.temperature_2m, feelsLike: current.apparent_temperature, humidity: current.relative_humidity_2m, windSpeed: current.wind_speed_10m, weatherCode: current.weather_code, time: current.time },
    daily: daily.time.map((date, index) => ({ date, weatherCode: daily.weather_code[index], min: daily.temperature_2m_min[index], max: daily.temperature_2m_max[index], sunrise: daily.sunrise[index], sunset: daily.sunset[index], daylight: daily.daylight_duration[index], precipitation: daily.precipitation_probability_max[index] })),
  };
}
