const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000 = 2451545.0;

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24;
  const yr = m <= 2 ? y - 1 : y;
  const mo = m <= 2 ? m + 12 : m;
  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
}

function julianCentury(jd: number): number {
  return (jd - J2000) / 36525;
}

function solarMeanAnomaly(T: number): number {
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  return M % 360;
}

function equationOfCenter(T: number, M: number): number {
  const Mrad = M * DEG_TO_RAD;
  return (
    (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad)
  );
}

function eclipticLongitude(M: number, C: number): number {
  return (M + C + 180 + 102.9372) % 360;
}

function obliquityOfEcliptic(T: number): number {
  return 23.4392911 - T * (0.0130042 - T * 1.64e-7 + T * 5.04e-7);
}

function sunDeclination(L: number, epsilon: number): number {
  return Math.asin(Math.sin(L * DEG_TO_RAD) * Math.sin(epsilon * DEG_TO_RAD)) * RAD_TO_DEG;
}

function equationOfTime(T: number): number {
  const M = solarMeanAnomaly(T);
  const L = eclipticLongitude(M, equationOfCenter(T, M));
  const epsilon = obliquityOfEcliptic(T);

  const y = Math.tan((epsilon * DEG_TO_RAD) / 2);
  const y2 = y * y;

  const Mrad = M * DEG_TO_RAD;
  const Lrad = L * DEG_TO_RAD;

  return (
    4 *
    RAD_TO_DEG *
    (y2 * Math.sin(2 * Mrad) -
      2 * Math.sin(Lrad) * Math.cos(epsilon * DEG_TO_RAD) +
      4 * y2 * Math.sin(Mrad) * Math.cos(2 * Mrad) -
      0.5 * y2 * y2 * Math.sin(4 * Mrad) -
      1.25 * Math.cos(2 * Lrad))
  );
}

function hourAngle(lat: number, dec: number): number {
  const latRad = lat * DEG_TO_RAD;
  const decRad = dec * DEG_TO_RAD;
  const zenith = 90.833 * DEG_TO_RAD;

  const cosHA =
    (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  if (cosHA < -1) return 180;
  if (cosHA > 1) return 0;

  return Math.acos(cosHA) * RAD_TO_DEG;
}

function sunTimesForDate(lat: number, lng: number, date: Date): { sunrise: Date; sunset: Date } {
  const jd = toJulianDay(date);
  const T = julianCentury(jd);

  const dec = sunDeclination(
    eclipticLongitude(solarMeanAnomaly(T), equationOfCenter(T, T)),
    obliquityOfEcliptic(T),
  );
  const eot = equationOfTime(T);

  const solarNoon = 720 - 4 * lng - eot;
  const ha = hourAngle(lat, dec);

  const sunriseMinutes = solarNoon - 4 * ha;
  const sunsetMinutes = solarNoon + 4 * ha;

  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return {
    sunrise: new Date(base + sunriseMinutes * 60000),
    sunset: new Date(base + sunsetMinutes * 60000),
  };
}

export function getSunTimes(
  lat: number,
  lng: number,
  date?: Date,
): { sunrise: Date; sunset: Date } {
  const d = date ? new Date(date.getTime()) : new Date();
  return sunTimesForDate(lat, lng, d);
}

export function getNextSunEvent(
  lat: number,
  lng: number,
): { type: 'sunrise' | 'sunset'; time: Date } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (let i = 0; i <= 2; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const times = sunTimesForDate(lat, lng, d);

    if (i === 0) {
      if (now < times.sunrise) {
        return { type: 'sunrise', time: times.sunrise };
      }
      if (now < times.sunset) {
        return { type: 'sunset', time: times.sunset };
      }
    } else {
      return { type: 'sunrise', time: times.sunrise };
    }
  }

  return { type: 'sunrise', time: new Date(today.getTime() + 86400000) };
}
