// Filter.tsx
"use client";

interface Location {
    country: string;
    city: string;
}

interface FilterProps {
    locations: Location[];
    selectedCountry: string;
    selectedCity: string;
    onChange: (country: string, city: string) => void;
}

export default function Filter({ locations, selectedCountry, selectedCity, onChange }: FilterProps) {
    const countries = Array.from(new Set(locations.map(l => l.country)));
    const cities = Array.from(new Set(locations
        .filter(l => l.country === selectedCountry)
        .map(l => l.city)
    ));

    return (
        <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                    value={selectedCountry}
                    onChange={(e) => onChange(e.target.value, "")}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">All Countries</option>
                    {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <select
                    value={selectedCity}
                    onChange={(e) => onChange(selectedCountry, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    disabled={!selectedCountry}
                >
                    <option value="">All Cities</option>
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}