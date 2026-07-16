import { getSunTimes, getNextSunEvent } from '../src/utils/sunCalc';

describe('getSunTimes', () => {
  const nycLat = 40.7128;
  const nycLng = -74.006;
  const summer2026 = new Date(Date.UTC(2026, 5, 21));
  const winter2026 = new Date(Date.UTC(2026, 11, 21));

  it('returns sunrise and sunset for NYC on summer solstice', () => {
    const { sunrise, sunset } = getSunTimes(nycLat, nycLng, summer2026);
    expect(sunrise).toBeInstanceOf(Date);
    expect(sunset).toBeInstanceOf(Date);
  });

  it('sunrise is before sunset', () => {
    const { sunrise, sunset } = getSunTimes(nycLat, nycLng, summer2026);
    expect(sunrise.getTime()).toBeLessThan(sunset.getTime());
  });

  it('returns finite numeric timestamps', () => {
    const { sunrise, sunset } = getSunTimes(nycLat, nycLng, summer2026);
    expect(Number.isFinite(sunrise.getTime())).toBe(true);
    expect(Number.isFinite(sunset.getTime())).toBe(true);
  });

  it('produces different results for different dates', () => {
    const summer = getSunTimes(nycLat, nycLng, summer2026);
    const winter = getSunTimes(nycLat, nycLng, winter2026);
    expect(summer.sunrise.getTime()).not.toBe(winter.sunrise.getTime());
    expect(summer.sunset.getTime()).not.toBe(winter.sunset.getTime());
  });

  it('winter sunrise is later than summer sunrise in NYC', () => {
    const summer = getSunTimes(nycLat, nycLng, summer2026);
    const winter = getSunTimes(nycLat, nycLng, winter2026);
    expect(winter.sunrise.getTime()).toBeGreaterThan(summer.sunrise.getTime());
  });

  it('winter and summer sunsets differ in NYC', () => {
    const summer = getSunTimes(nycLat, nycLng, summer2026);
    const winter = getSunTimes(nycLat, nycLng, winter2026);
    expect(summer.sunset.getTime()).not.toBe(winter.sunset.getTime());
  });

  it('works for southern hemisphere (Sydney)', () => {
    const sydneyLat = -33.8688;
    const sydneyLng = 151.2093;
    const { sunrise, sunset } = getSunTimes(sydneyLat, sydneyLng, summer2026);
    expect(sunrise).toBeInstanceOf(Date);
    expect(sunset).toBeInstanceOf(Date);
    expect(sunrise.getTime()).toBeLessThan(sunset.getTime());
  });

  it('Sydney produces different results for different seasons', () => {
    const sydneyLat = -33.8688;
    const sydneyLng = 151.2093;
    const june = getSunTimes(sydneyLat, sydneyLng, summer2026);
    const december = getSunTimes(sydneyLat, sydneyLng, winter2026);
    expect(june.sunrise.getTime()).not.toBe(december.sunrise.getTime());
    expect(june.sunset.getTime()).not.toBe(december.sunset.getTime());
  });

  it('different locations produce different results', () => {
    const nyc = getSunTimes(nycLat, nycLng, summer2026);
    const sydney = getSunTimes(-33.8688, 151.2093, summer2026);
    expect(nyc.sunrise.getTime()).not.toBe(sydney.sunrise.getTime());
    expect(nyc.sunset.getTime()).not.toBe(sydney.sunset.getTime());
  });
});

describe('getNextSunEvent', () => {
  it('returns an object with type and time', () => {
    const event = getNextSunEvent(40.7128, -74.006);
    expect(event).toMatchObject({
      type: expect.any(String),
      time: expect.any(Date),
    });
  });

  it('type is either sunrise or sunset', () => {
    const event = getNextSunEvent(40.7128, -74.006);
    expect(['sunrise', 'sunset']).toContain(event.type);
  });

  it('time is in the future', () => {
    const before = Date.now();
    const event = getNextSunEvent(40.7128, -74.006);
    expect(event.time.getTime()).toBeGreaterThan(before);
  });

  it('works for southern hemisphere', () => {
    const event = getNextSunEvent(-33.8688, 151.2093);
    expect(event).toMatchObject({
      type: expect.any(String),
      time: expect.any(Date),
    });
    expect(event.time.getTime()).toBeGreaterThan(Date.now());
    expect(['sunrise', 'sunset']).toContain(event.type);
  });
});
