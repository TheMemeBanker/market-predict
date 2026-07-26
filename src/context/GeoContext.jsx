import { createContext, useContext, useState, useEffect } from 'react';

const GeoContext = createContext({
  isRestricted: false,
  isLoading: true,
  country: null,
  countryCode: null,
});

// Countries where online gambling is restricted
const RESTRICTED_COUNTRIES = ['US', 'USA', 'United States'];

export function GeoProvider({ children }) {
  const [geoState, setGeoState] = useState({
    isRestricted: false,
    isLoading: true,
    country: null,
    countryCode: null,
  });

  useEffect(() => {
    const checkLocation = async () => {
      try {
        // Use ipapi.co for geolocation (free tier: 1000 requests/day)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        const countryCode = data.country_code || data.country;
        const country = data.country_name || data.country;

        const isRestricted = RESTRICTED_COUNTRIES.includes(countryCode) ||
                            RESTRICTED_COUNTRIES.includes(country);

        setGeoState({
          isRestricted,
          isLoading: false,
          country,
          countryCode,
        });
      } catch (error) {
        console.error('Geolocation check failed:', error);
        // On error, allow access but log the issue
        setGeoState({
          isRestricted: false,
          isLoading: false,
          country: null,
          countryCode: null,
        });
      }
    };

    checkLocation();
  }, []);

  return (
    <GeoContext.Provider value={geoState}>
      {children}
    </GeoContext.Provider>
  );
}

export function useGeo() {
  return useContext(GeoContext);
}
