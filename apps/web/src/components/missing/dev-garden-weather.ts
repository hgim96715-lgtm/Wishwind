/** DEV 메뉴에서 고른 정원 날씨(맑음·비·눈)를 저장하는 키와 변경 알림 이벤트 (개발 모드에서만 씀) */
export const DEV_GARDEN_WEATHER_KEY = "dev_garden_weather";
export const DEV_GARDEN_WEATHER_EVENT = "dev-garden-weather";
export type DevGardenWeather = "" | "clear" | "rain" | "snow";
