// MapComponent.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Filter from "./Filter";

interface Location {
  name: string;
  annual_turnover: string;
  company_size: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface RouteLegInfo {
  distance: string;
  duration: string;
}

interface RouteInfo {
    totalDistance: string;
    totalDuration: string;
    legs: Array<{
      from: string;
      to: string;
      distance: string;
      duration: string;
    }>;
  }

export default function MapComponent() {
    const mapRef = useRef<HTMLDivElement>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [routePlanning, setRoutePlanning] = useState<boolean>(false);
  const [routeLocations, setRouteLocations] = useState<Location[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  const [minTurnover, setMinTurnover] = useState<number>(5000000); // Default to 5 million

  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    const loadMap = async () => {
      try {
        const res = await fetch("/locations.json");
        const data = await res.json();
        setLocations(data);
        setFilteredLocations(data);

        const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
        
        if (!window.google?.maps?.marker?.AdvancedMarkerElement) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,geometry&callback=initMap`;
            script.async = true;
            script.defer = true;
            script.onerror = reject;
            
            window.initMap = () => {
              // Add safety check for map container
              if (!mapRef.current) {
                reject(new Error("Map container not found"));
                return;
              }
              
              resolve(true);
              delete window.initMap;
            };
            
            document.head.appendChild(script);
          });
        }

        // Ensure map container exists
        if (!mapRef.current) {
          throw new Error("Map container not found");
        }

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: 48.1486, lng: 17.1077 },
          zoom: 5,
          mapId: "DEMO_MAP_ID" // Add a valid map ID
        });
        
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true
        });

        setMap(mapInstance);
        setMapLoading(false);
      } catch (error) {
        console.error("Map loading error:", error);
        setMapError(error instanceof Error ? error.message : "Failed to load map");
        setMapLoading(false);
      }
    };

    loadMap();
    
    return () => {
      markers.forEach(marker => marker.map = null);
    };
  }, []);

  useEffect(() => {
    if (map && window.google?.maps?.marker?.AdvancedMarkerElement) {
      markers.forEach((m) => m.map = null);

      const newMarkers = filteredLocations.map((loc) => {
        const sizeNum = parseInt(loc.company_size.replace(/\D/g, "")) || 0;
        const pinColor = sizeNum > 100 ? "#dc2626" : "#16a34a";

        const pinSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="${pinColor}" d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 4.69 7.5 15.5 8.5 15.5s8.5-10.81 8.5-15.5S16.69 0 12 0z"/>
        </svg>`;

        const MarkerClass = window.google.maps.marker.AdvancedMarkerElement;
        const marker = new MarkerClass({
          position: { lat: loc.lat, lng: loc.lng },
          map,
          title: loc.name,
          content: document.createElement("div"),
        });

        marker.content.innerHTML = pinSVG;
        marker.content.style.cursor = "pointer";

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="min-w-[200px]">
              <h3 class="font-semibold text-lg">${loc.name}</h3>
              <p class="mt-1">Turnover: ${loc.annual_turnover}</p>
              <p>Size: ${loc.company_size}</p>
              <p class="text-sm text-gray-600">${loc.address}, ${loc.city}, ${loc.country}</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          if (routePlanning) {
            if (!routeLocations.find(l => l.name === loc.name && l.address === loc.address)) {
              setRouteLocations((prev) => [...prev, loc]);
            }
          } else {
            infoWindow.open(map, marker);
          }
        });

        return marker;
      });

      setMarkers(newMarkers);
    }
  }, [map, filteredLocations, routePlanning, routeLocations]);



  function handleFilterChange(country: string, city: string, newMinTurnover: number) {
    setSelectedCountry(country);
    setSelectedCity(city);
    setMinTurnover(newMinTurnover || 0);

    const filtered = locations.filter((loc) => {
        const turnover = parseInt(loc.annual_turnover.replace(/\D/g, ""), 10);
        return (
            (!country || loc.country === country) &&
            (!city || loc.city === city) &&
            turnover >= (newMinTurnover || 0)
        );
    });

    setFilteredLocations(filtered);
    clearRoute();
}

  function toggleRoutePlanning() {
    setRoutePlanning((prev) => {
      if (prev) clearRoute();
      return !prev;
    });
  }

  function planRoute() {
    if (!map || routeLocations.length < 2 || !directionsRendererRef.current) return;

    const directionsService = new google.maps.DirectionsService();
    const waypoints = routeLocations.slice(1, -1).map((loc) => ({
      location: new google.maps.LatLng(loc.lat, loc.lng),
      stopover: true,
    }));

    directionsService.route(
      {
        origin: new google.maps.LatLng(routeLocations[0].lat, routeLocations[0].lng),
        destination: new google.maps.LatLng(
          routeLocations[routeLocations.length - 1].lat,
          routeLocations[routeLocations.length - 1].lng
        ),
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererRef.current?.setDirections(result);
          
          const route = result.routes[0];
          const legs = route.legs || [];
          
          let totalDistance = 0;
          let totalDuration = 0;

    

          const legData = legs.map((leg) => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
            
            return {
              distance: leg.distance?.text || "",
              duration: leg.duration?.text || "",
            };
          });

          const totalSeconds = legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.round((totalSeconds % 3600) / 60);

          setRouteInfo({
            totalDistance: `${(totalDistance / 1000).toFixed(1)} km`,
            totalDuration: `${hours}h ${minutes.toString().padStart(2, '0')}m`,
            legs: legData,
          });
        }
      }
    );
  }

  function clearRoute() {
    setRouteLocations([]);
    setRouteInfo(null);
    directionsRendererRef.current?.setDirections({ routes: [] });
  }


  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
   <Filter
    locations={locations}
    selectedCountry={selectedCountry}
    selectedCity={selectedCity}
    minTurnover={minTurnover}
    onChange={(country, city, minT, maxT) => {
        setMinTurnover(minT);
        handleFilterChange(country, city, minT, maxT);
    }}
/>
  
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleRoutePlanning}
          className={`px-4 py-2 rounded-lg transition-colors ${
            routePlanning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {routePlanning ? "Cancel Route Planning" : "Plan Route"}
        </button>
  
        {routePlanning && (
          <button
            onClick={planRoute}
            disabled={routeLocations.length < 2}
            className={`px-4 py-2 rounded-lg transition-colors ${
              routeLocations.length >= 2
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Calculate Route
          </button>
        )}
  
        {routeInfo && (
          <button
            onClick={clearRoute}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear Route
          </button>
        )}
      </div>
  
      {routePlanning && routeLocations.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Selected Route Points</h3>
          <div className="space-y-2">
            {routeLocations.map((loc, index) => (
              <div 
                key={`${loc.lat}-${loc.lng}-${index}`} 
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <div className="flex-1">
                  <span className="font-medium text-blue-600">Point {index + 1}:</span>
                  <span className="ml-2">{loc.name}</span>
                  <span className="block text-sm text-gray-600 mt-1">
                    {loc.address}, {loc.city}, {loc.country}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newLocations = [...routeLocations];
                    newLocations.splice(index, 1);
                    setRouteLocations(newLocations);
                    if (routeInfo) clearRoute();
                  }}
                  className="ml-4 p-1 hover:bg-red-100 rounded-full"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-red-500" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
  
      {mapLoading && (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
          Loading map...
        </div>
      )}
  
      {mapError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg">
          {mapError}
        </div>
      )}
  
      {routeInfo && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="font-medium text-gray-600">Total Distance</p>
              <p className="text-3xl font-bold text-blue-600">{routeInfo.totalDistance}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Total Duration</p>
              <p className="text-3xl font-bold text-green-600">{routeInfo.totalDuration}</p>
            </div>
          </div>
  
          <h3 className="text-lg font-semibold mb-4">Route Details</h3>
          <div className="space-y-4">
            {routeInfo.legs.map((leg, index) => (
              <div 
                key={index} 
                className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-600">Leg {index + 1}</span>
                  <span className="text-sm text-gray-500">
                    {leg.duration} • {leg.distance}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">From:</span>
                    <span className="font-medium">
                      {routeLocations[index].name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">To:</span>
                    <span className="font-medium">
                      {routeLocations[index + 1].name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
  
      <div 
        id="map" 
        ref={mapRef}
        className="w-full h-[600px] rounded-xl border border-gray-200 shadow-lg"
      />
    </div>
  );

}