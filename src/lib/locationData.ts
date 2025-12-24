import { locationData, type Country, type State, type City } from './locationDataComprehensive';

export type SimpleCountry = { name: string; code: string };

export const getCountries = (): SimpleCountry[] => {
	const countries = locationData.countries.map((c: Country) => ({ name: c.name, code: c.code }));
	// Move India to the first position
	const indiaIndex = countries.findIndex(c => c.name === 'India');
	if (indiaIndex > 0) {
		const india = countries.splice(indiaIndex, 1)[0];
		countries.unshift(india);
	}
	return countries;
};

export const getStatesByCountry = (countryName: string): string[] => {
	const country = locationData.countries.find((c: Country) => c.name === countryName);
	return country ? country.states.map((s: State) => s.name) : [];
};

export const getCitiesByState = (countryName: string, stateName: string): string[] => {
	const country = locationData.countries.find((c: Country) => c.name === countryName);
	if (!country) return [];
	const state = country.states.find((s: State) => s.name === stateName);
	return state ? state.cities.map((ci: City) => ci.name) : [];
};

export const getCountryCodeByName = (countryName: string): string | undefined => {
	return locationData.countries.find((c: Country) => c.name === countryName)?.code;
};


