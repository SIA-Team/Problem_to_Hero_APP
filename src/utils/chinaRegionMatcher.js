const provinceData = require('../data/chinaRegions/province.json');
const cityData = require('../data/chinaRegions/city.json');
const areaData = require('../data/chinaRegions/area.json');

const MUNICIPALITIES = {
  '11': '北京市',
  '12': '天津市',
  '31': '上海市',
  '50': '重庆市',
};

const normalizeRegionName = (name) => {
  if (!name) {
    return '';
  }

  return String(name)
    .trim()
    .replace(/\s+/g, '')
    .replace(/特别行政区/g, '')
    .replace(/壮族自治区|回族自治区|维吾尔自治区|自治区/g, '')
    .replace(/自治州|自治县/g, '')
    .replace(/地区|盟/g, '')
    .replace(/新区/g, '')
    .replace(/林区/g, '')
    .replace(/矿区/g, '')
    .replace(/省|市|区|县|旗/g, '');
};

const matchRegionByName = (items, name) => {
  if (!name || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const trimmedName = String(name).trim();
  const normalizedName = normalizeRegionName(trimmedName);

  return (
    items.find((item) => item.name === trimmedName) ||
    items.find((item) => normalizeRegionName(item.name) === normalizedName) ||
    items.find((item) => item.name.includes(trimmedName) || trimmedName.includes(item.name)) ||
    null
  );
};

const createVirtualMunicipalityCity = (province) => {
  if (!province) {
    return null;
  }

  return {
    code: `${province.code.slice(0, 2)}0100`,
    name: province.name,
    province: province.province,
    city: '01',
  };
};

export const getChinaProvinceOptions = () => provinceData.map((item) => ({ ...item }));

export const getChinaCityOptions = (provinceCode) => {
  if (!provinceCode) {
    return [];
  }

  const provincePrefix = String(provinceCode).slice(0, 2);
  const cities = cityData.filter((item) => item.province === provincePrefix);

  if (cities.length > 0) {
    return cities;
  }

  const province = provinceData.find((item) => item.code === String(provinceCode));
  if (province && MUNICIPALITIES[provincePrefix]) {
    return [createVirtualMunicipalityCity(province)];
  }

  return [];
};

export const getChinaDistrictOptions = (cityCode) => {
  if (!cityCode) {
    return [];
  }

  const cityPrefix = String(cityCode).slice(0, 4);
  return areaData.filter((item) => item.code.slice(0, 4) === cityPrefix);
};

export const getChinaRegionByCodes = ({ provinceId, cityId, districtId }) => {
  const provinceCode = provinceId ? String(provinceId) : '';
  const cityCode = cityId ? String(cityId) : '';
  const districtCode = districtId ? String(districtId) : '';

  const province = provinceData.find((item) => item.code === provinceCode) || null;
  const city = cityCode
    ? getChinaCityOptions(provinceCode).find((item) => item.code === cityCode) || null
    : null;
  const district = districtCode
    ? getChinaDistrictOptions(cityCode).find((item) => item.code === districtCode) || null
    : null;

  return { province, city, district };
};

const inferCityFromDistrict = (province, districtName) => {
  if (!province || !districtName) {
    return { city: null, district: null };
  }

  const provincePrefix = province.code.slice(0, 2);
  const matchedDistrict = areaData.find(
    (item) =>
      item.province === provincePrefix &&
      normalizeRegionName(item.name) === normalizeRegionName(districtName)
  );

  if (!matchedDistrict) {
    return { city: null, district: null };
  }

  const inferredCityCode = `${matchedDistrict.code.slice(0, 4)}00`;
  const city =
    getChinaCityOptions(province.code).find((item) => item.code === inferredCityCode) ||
    (MUNICIPALITIES[provincePrefix] ? createVirtualMunicipalityCity(province) : null);

  return {
    city,
    district: matchedDistrict,
  };
};

export const resolveChinaRegionFromAddress = (address = {}) => {
  const provinceName = address.region || address.province || '';
  const cityName = address.city || address.subregion || '';
  const districtName = address.district || '';

  const province = matchRegionByName(provinceData, provinceName);
  if (!province) {
    return null;
  }

  let city = matchRegionByName(getChinaCityOptions(province.code), cityName);
  let district = city ? matchRegionByName(getChinaDistrictOptions(city.code), districtName) : null;

  if (!city && MUNICIPALITIES[province.code.slice(0, 2)]) {
    city = createVirtualMunicipalityCity(province);
    district = matchRegionByName(getChinaDistrictOptions(city.code), districtName);
  }

  if (!city && districtName) {
    const inferred = inferCityFromDistrict(province, districtName);
    city = inferred.city;
    district = inferred.district;
  }

  if (!province || !city || !district) {
    return null;
  }

  return {
    provinceId: Number(province.code),
    cityId: Number(city.code),
    districtId: Number(district.code),
    provinceName: province.name,
    cityName: city.name,
    districtName: district.name,
  };
};

export const buildEmergencyAddressText = ({
  provinceName,
  cityName,
  districtName,
  street,
  streetNumber,
  name,
}) => {
  const parts = [];

  const pushUnique = (value) => {
    if (!value) {
      return;
    }

    const text = String(value).trim();
    if (!text || parts.includes(text)) {
      return;
    }

    parts.push(text);
  };

  pushUnique(provinceName);
  pushUnique(cityName);
  pushUnique(districtName);
  pushUnique(street);
  pushUnique(streetNumber);
  pushUnique(name);

  return parts.join('');
};
