// Update FilterProps interface
interface FilterProps {
    locations: Location[];
    selectedCountry: string;
    selectedCity: string;
    minTurnover: number;
    onChange: (country: string, city: string, minTurnover: number) => void;
}

// Update Filter component
export default function Filter({ locations, selectedCountry, selectedCity, minTurnover, onChange }: FilterProps) {
    const countries = Array.from(new Set(locations.map(l => l.country)));
    const cities = Array.from(new Set(locations
        .filter(l => l.country === selectedCountry)
        .map(l => l.city)
    ));

    // Get max turnover for input limits
    const maxTurnover = Math.max(...locations.map(l => 
        parseInt(l.annual_turnover.replace(/\D/g, ""))
    ));

    return (
        <div className="flex flex-wrap gap-4">
            {/* Country Filter */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                    value={selectedCountry}
                    onChange={(e) => onChange(e.target.value, "", minTurnover)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                >
                    <option value="">All Countries</option>
                    {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                    ))}
                </select>
            </div>

            {/* City Filter */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <select
                    value={selectedCity}
                    onChange={(e) => onChange(selectedCountry, e.target.value, minTurnover)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    disabled={!selectedCountry}
                >
                    <option value="">All Cities</option>
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>

            {/* Turnover Filter */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Turnover (EUR)</label>
                <input
                    type="number"
                    value={minTurnover || ""}
                    onChange={(e) => onChange(selectedCountry, selectedCity, Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="5,000,000"
                    min="0"
                    max={maxTurnover}
                    step="100000"
                />
            </div>
        </div>
    );
}