import React, { useState, useEffect, useCallback } from 'react';
import { FARE_DATA, EC_TO_US_RATE } from '../constants';
import { FareCategory, CalculatedFare, Currency, TripType, StandardFareItem, CruiseShipFareItem, KingstownTourFareItem, BusRouteItem, AnyFareItem } from '../types';

// Helper function to match passenger number to string ranges like "1 to 4", "5 to 10", "Over 10"
const matchPassengers = (count: number, rangeStr: string): boolean => {
  if (rangeStr.toLowerCase().startsWith("over ")) {
    const limit = parseInt(rangeStr.split(" ")[1], 10);
    return !isNaN(limit) && count > limit;
  } else if (rangeStr.includes(" to ")) {
    const parts = rangeStr.split(" to ");
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    return !isNaN(min) && !isNaN(max) && count >= min && count <= max;
  }
  const exactMatch = parseInt(rangeStr, 10);
  if (!isNaN(exactMatch)) return count === exactMatch;
  
  return false; 
};

type FareMode = 'bus' | 'taxi';

export const FareCalculator: React.FC = () => {
  const [fareMode, setFareMode] = useState<FareMode>('taxi');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [selectedItemKey, setSelectedItemKey] = useState<string>(''); 
  const [destinationSearchInput, setDestinationSearchInput] = useState<string>('');
  const [numberOfPassengers, setNumberOfPassengers] = useState<number>(1);
  const [isAfterHours, setIsAfterHours] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>(TripType.ONE_WAY);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(Currency.EC);
  const [calculatedFare, setCalculatedFare] = useState<CalculatedFare | null>(null);
  const [isSchoolChildInUniform, setIsSchoolChildInUniform] = useState<boolean>(false);


  const availableCategories = FARE_DATA.filter(cat => {
    if (fareMode === 'bus') {
      return !!cat.routes; 
    } else { 
      return !!cat.fares;  
    }
  });

  const selectedCategory = availableCategories.find(cat => cat.category === selectedCategoryName);

  const resetSubSelections = useCallback(() => {
    setSelectedItemKey('');
    setDestinationSearchInput('');
    setCalculatedFare(null);
    setIsAfterHours(false); 
    setIsSchoolChildInUniform(false);
    setTripType(TripType.ONE_WAY);
  }, []);
  
  const handleFareModeChange = (newMode: FareMode) => {
    setFareMode(newMode);
    setSelectedCategoryName('');
    resetSubSelections(); // This will reset toggles like isSchoolChildInUniform and isAfterHours
  };

  useEffect(() => {
    resetSubSelections();
  }, [selectedCategoryName, resetSubSelections]);
  
   useEffect(() => {
    if (!selectedCategoryName && fareMode === 'taxi' && selectedCategory?.category !== "Tours around Kingstown (Minimum of two (2) hours)") {
      setCalculatedFare(null);
      return;
    }
    if (!selectedCategoryName && fareMode === 'bus') {
        setCalculatedFare(null);
        return;
    }
    
    const category = FARE_DATA.find(cat => cat.category === selectedCategoryName);
    if (!category) {
      setCalculatedFare(null);
      return;
    }

    let oneWayEC: number | undefined;
    let oneWayUS: number | undefined;
    let returnEC: number | undefined;
    let returnUS: number | undefined;
    let notes = "";

    if (category.routes) { // BusRouteCategory
      if (!selectedItemKey) { setCalculatedFare(null); return; }
      const route = category.routes.find(r => r.name === selectedItemKey) as BusRouteItem | undefined;
      if (route) {
        oneWayEC = route.fare_ec; 
        if (isSchoolChildInUniform) {
          oneWayEC *= 0.5;
          notes = "Bus fare (School Child Discount).";
        } else {
          notes = "Bus fare.";
        }
      }
    } else if (category.fares) { // Taxi categories
        let foundFareItem: AnyFareItem | undefined;

        if (category.category.startsWith("From Cruise Ship Berth") || category.category === "Tours around Kingstown (Minimum of two (2) hours)") {
            const itemsForSelection = (category.fares as AnyFareItem[]).filter(
                (item): item is CruiseShipFareItem | KingstownTourFareItem => {
                    const hasPassengers = 'passengers' in item;
                    if (category.category === "Tours around Kingstown (Minimum of two (2) hours)") {
                        return hasPassengers; 
                    }
                    return 'place' in item && item.place === selectedItemKey && hasPassengers;
                }
            );

            foundFareItem = itemsForSelection.find(item => matchPassengers(numberOfPassengers, item.passengers));

            if (!foundFareItem && itemsForSelection.length > 0 && selectedItemKey && category.category !== "Tours around Kingstown (Minimum of two (2) hours)") {
                notes = `No specific fare tier for ${numberOfPassengers} passenger(s) for this selection. Available tiers for ${selectedItemKey}: ${itemsForSelection.map(i => i.passengers).join(', ')}. Please adjust passenger count or select an available tier.`;
                setCalculatedFare({ amount: 0, currencySymbol: displayCurrency === Currency.EC ? 'EC$' : 'US$', details: notes });
                return;
            } else if (!foundFareItem && category.category === "Tours around Kingstown (Minimum of two (2) hours)" && itemsForSelection.length > 0) {
                 notes = `No specific fare tier for ${numberOfPassengers} passenger(s) for this tour. Available tiers: ${itemsForSelection.map(i => i.passengers).join(', ')}. Please adjust passenger count.`;
                setCalculatedFare({ amount: 0, currencySymbol: displayCurrency === Currency.EC ? 'EC$' : 'US$', details: notes });
                return;
            }
        } else { 
            if (!selectedItemKey) { setCalculatedFare(null); return; }
            foundFareItem = (category.fares as StandardFareItem[]).find(item => item.place === selectedItemKey);
        }
        
      if (foundFareItem) {
        if ('regular_ec' in foundFareItem && 'place' in foundFareItem && 'after_hours_ec' in foundFareItem) { 
          const item = foundFareItem as StandardFareItem;
          const baseEC = isAfterHours ? item.after_hours_ec : item.regular_ec;
          const baseUS = isAfterHours ? item.after_hours_us : item.regular_us;

          if (category.category.includes("(Per Passenger)")) {
            oneWayEC = baseEC * numberOfPassengers;
            oneWayUS = baseUS * numberOfPassengers;
            notes = `Per passenger rate. Total for ${numberOfPassengers} passenger(s).`;
          } else if (category.category.includes("(1 to 3 Passengers)")) {
            oneWayEC = baseEC;
            oneWayUS = baseUS;
            notes = `Fare for 1-3 passengers.`;
            if (numberOfPassengers > 3) {
              notes += ` Current selection: ${numberOfPassengers} passengers; this rate is for 1-3.`;
            }
          } else { 
            oneWayEC = baseEC;
            oneWayUS = baseUS;
            notes = `Standard taxi rate.`;
          }
          if (oneWayEC !== undefined) returnEC = oneWayEC * 2;
          if (oneWayUS !== undefined) returnUS = oneWayUS * 2;

        } else if ('regular_one_way_ec' in foundFareItem && 'place' in foundFareItem) { 
          const item = foundFareItem as CruiseShipFareItem;
          const passengerTier = item.passengers;

          if (passengerTier === "1 to 4") { 
            oneWayEC = isAfterHours ? item.after_hours_one_way_ec : item.regular_one_way_ec;
            oneWayUS = isAfterHours ? item.after_hours_one_way_us : item.regular_one_way_us;
            returnEC = isAfterHours ? (item.after_hours_one_way_ec * 2) : item.regular_return_ec;
            returnUS = isAfterHours ? (item.after_hours_one_way_us * 2) : item.regular_return_us;
            if(isAfterHours && tripType === TripType.RETURN && !item.hasOwnProperty('after_hours_return_ec')) notes += " After-hours return estimated as 2x one-way. ";
            notes += `Fare for ${passengerTier}.`;
          } else { 
            const p_oneWayEC = isAfterHours ? item.after_hours_one_way_ec : item.regular_one_way_ec;
            const p_oneWayUS = isAfterHours ? item.after_hours_one_way_us : item.regular_one_way_us;
            const p_returnEC = isAfterHours ? (item.after_hours_one_way_ec * 2) : item.regular_return_ec;
            const p_returnUS = isAfterHours ? (item.after_hours_one_way_us * 2) : item.regular_return_us;
            
            oneWayEC = p_oneWayEC * numberOfPassengers;
            oneWayUS = p_oneWayUS * numberOfPassengers;
            returnEC = p_returnEC * numberOfPassengers;
            returnUS = p_returnUS * numberOfPassengers;
            if(isAfterHours && tripType === TripType.RETURN && !item.hasOwnProperty('after_hours_return_ec')) notes += " After-hours return estimated as 2x one-way per passenger. ";
            notes += `Per passenger rate for ${passengerTier}. Total for ${numberOfPassengers} passenger(s).`;
          }
        } else if ('regular_return_ec' in foundFareItem && !('place' in foundFareItem)) { 
          const item = foundFareItem as KingstownTourFareItem;
          const passengerTier = item.passengers;

          if (passengerTier === "1 to 4") { 
            returnEC = isAfterHours ? item.after_hours_return_ec : item.regular_return_ec;
            returnUS = isAfterHours ? item.after_hours_return_us : item.regular_return_us;
            notes = `Fare for ${passengerTier}. Tour (return trip).`;
          } else { 
            const p_returnEC = isAfterHours ? item.after_hours_return_ec : item.regular_return_ec;
            const p_returnUS = isAfterHours ? item.after_hours_return_us : item.regular_return_us;
            returnEC = p_returnEC * numberOfPassengers;
            returnUS = p_returnUS * numberOfPassengers;
            notes = `Per passenger rate for ${passengerTier}. Tour (return trip). Total for ${numberOfPassengers} passenger(s).`;
          }
        }
      }
    }

    let finalEC: number | undefined;
    let finalUS: number | undefined;

    if (category?.category === "Tours around Kingstown (Minimum of two (2) hours)") {
        finalEC = returnEC;
        finalUS = returnUS;
    } else if (category?.routes) { 
        finalEC = oneWayEC;
        finalUS = oneWayEC !== undefined ? oneWayEC / EC_TO_US_RATE : undefined;
    } else if (tripType === TripType.RETURN) {
        finalEC = returnEC;
        finalUS = returnUS;
        if (finalEC !== undefined && !notes.toLowerCase().includes("return trip")) notes += " (Return Trip)";
    } else { 
        finalEC = oneWayEC;
        finalUS = oneWayUS;
        if (finalEC !== undefined && !notes.toLowerCase().includes("one-way")) notes += " (One-Way)";
    }
    
    if (fareMode === 'taxi' && isAfterHours && !notes.toLowerCase().includes("after hours") && !category?.routes) notes += " (After hours)";

    if (finalEC !== undefined) {
      const amount = displayCurrency === Currency.EC ? finalEC : (finalUS !== undefined ? finalUS : finalEC / EC_TO_US_RATE);
      setCalculatedFare({ amount: parseFloat(amount.toFixed(2)), currencySymbol: displayCurrency === Currency.EC ? "EC$" : "US$", details: notes.trim() });
    } else if (selectedCategoryName && (selectedItemKey || category?.category === "Tours around Kingstown (Minimum of two (2) hours)" || (category?.routes && selectedItemKey))) {
        if (!calculatedFare || calculatedFare.amount !==0) { 
            setCalculatedFare({amount: 0, currencySymbol: displayCurrency === Currency.EC ? "EC$" : "US$", details: notes || "Fare information not available for current selection."})
        }
    } else {
      setCalculatedFare(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryName, selectedItemKey, numberOfPassengers, isAfterHours, tripType, displayCurrency, fareMode, isSchoolChildInUniform]);

  const commonInputClass = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-card-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT transition-colors";
  const labelClass = "block text-sm font-medium mb-1 text-muted-light dark:text-muted-dark";

  const handleDestinationInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setDestinationSearchInput(inputValue);

    const uniquePlaces = selectedCategory?.fares ? [...new Set(
      (selectedCategory.fares as Array<StandardFareItem | CruiseShipFareItem>)
      .filter(f => 'place' in f)
      .map(f => f.place)
    )] : [];
  
    if (uniquePlaces.includes(inputValue)) {
      setSelectedItemKey(inputValue);
    } else {
      setSelectedItemKey(''); 
    }
  };

  const renderSubOptions = () => {
    if (!selectedCategory) return null;

    if (selectedCategory.routes) { // Bus
      return (
        <div>
          <label htmlFor="route-select" className={labelClass}>Select Route:</label>
          <select id="route-select" value={selectedItemKey} onChange={e => setSelectedItemKey(e.target.value)} className={commonInputClass} aria-label="Select Route">
            <option value="">-- Select a Route --</option>
            {selectedCategory.routes.map(route => (
              <option key={route.name} value={route.name}>{route.name}</option>
            ))}
          </select>
        </div>
      );
    }

    // Taxi fares (excluding Kingstown Tours which has no sub-selection by place)
    if (selectedCategory.fares && selectedCategory.category !== "Tours around Kingstown (Minimum of two (2) hours)") {
      const places = [...new Set(
        (selectedCategory.fares as Array<StandardFareItem | CruiseShipFareItem>)
        .filter(f => 'place' in f) 
        .map(f => f.place)
      )];

      return (
        <div>
          <label htmlFor="place-search-input" className={labelClass}>Select Place/Destination:</label>
          <input 
            type="text" 
            id="place-search-input"
            list="destination-list"
            value={destinationSearchInput} 
            onChange={handleDestinationInputChange} 
            className={commonInputClass}
            placeholder="Type or select a destination"
            aria-label="Search and Select Place or Destination"
          />
          <datalist id="destination-list">
            {places.map(place => (
              <option key={place} value={place} />
            ))}
          </datalist>
        </div>
      );
    }
    return null; 
  };
  

  return (
    <div className="bg-card-light dark:bg-card-dark p-6 sm:p-8 rounded-xl shadow-2xl max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-primary-DEFAULT dark:text-primary-light mb-8 text-center">Calculate Your Fare</h2>
      
      <div className="space-y-6">
        <div>
            <label className={labelClass}>Select Fare Type:</label>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button 
                    onClick={() => handleFareModeChange('bus')}
                    className={`flex-1 p-3 text-sm font-medium transition-colors ${fareMode === 'bus' ? 'bg-primary-DEFAULT text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    aria-pressed={fareMode === 'bus'}
                >
                    Bus Fares
                </button>
                <button 
                    onClick={() => handleFareModeChange('taxi')}
                    className={`flex-1 p-3 text-sm font-medium transition-colors ${fareMode === 'taxi' ? 'bg-primary-DEFAULT text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    aria-pressed={fareMode === 'taxi'}
                >
                    Taxi Fares
                </button>
            </div>
        </div>

        <div>
          <label htmlFor="category-select" className={labelClass}>Select Fare Category:</label>
          <select 
            id="category-select" 
            value={selectedCategoryName} 
            onChange={e => setSelectedCategoryName(e.target.value)} 
            className={commonInputClass}
            aria-label="Select Fare Category"
            disabled={availableCategories.length === 0}
          >
            <option value="">-- Select a Category --</option>
            {availableCategories.map(cat => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
        </div>

        {selectedCategoryName && renderSubOptions()}

        {/* Container for Passengers (Taxi only) and Toggles */}
        {(selectedCategoryName || (fareMode === 'taxi' && selectedCategory?.category === "Tours around Kingstown (Minimum of two (2) hours)")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-end">
            {/* Column 1: Number of Passengers (Taxi Only) */}
            {fareMode === 'taxi' ? (
              <div>
                <label htmlFor="passengers" className={labelClass}>Number of Passengers:</label>
                <input 
                  type="number" 
                  id="passengers" 
                  value={numberOfPassengers} 
                  onChange={e => setNumberOfPassengers(Math.max(1, parseInt(e.target.value)))} 
                  min="1" 
                  className={commonInputClass}
                  aria-label="Number of Passengers" 
                />
              </div>
            ) : (
              <div /> /* Empty div to maintain grid structure for bus mode; toggles will span */
            )}
            
            {/* Column 2: Toggles. For bus mode, this container spans both columns. */}
            <div className={`flex flex-col sm:flex-row sm:gap-x-6 ${fareMode === 'bus' ? 'md:col-span-2' : ''}`}>
              {/* After Hours Toggle (TAXI ONLY) */}
              {fareMode === 'taxi' && (
                <div className="flex items-center">
                  <label htmlFor="after-hours-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" id="after-hours-toggle" className="sr-only" checked={isAfterHours} onChange={() => setIsAfterHours(!isAfterHours)} />
                      <div className="block bg-gray-200 dark:bg-gray-600 w-14 h-8 rounded-full transition"></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${isAfterHours ? 'translate-x-6 !bg-primary-DEFAULT' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-text-light dark:text-text-dark font-medium">After Hours</div>
                  </label>
                </div>
              )}

              {/* School Child in Uniform Toggle (BUS ONLY) */}
              {fareMode === 'bus' && (
                <div className="flex items-center">
                  <label htmlFor="school-child-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" id="school-child-toggle" className="sr-only" checked={isSchoolChildInUniform} onChange={() => setIsSchoolChildInUniform(!isSchoolChildInUniform)} />
                      <div className="block bg-gray-200 dark:bg-gray-600 w-14 h-8 rounded-full transition"></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${isSchoolChildInUniform ? 'translate-x-6 !bg-primary-DEFAULT' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-text-light dark:text-text-dark font-medium">School Child (Uniform)</div>
                  </label>
                </div>
              )}

              {/* Trip Type Toggle (TAXI ONLY, conditional) */}
              {fareMode === 'taxi' && selectedCategory && selectedCategory.category !== "Tours around Kingstown (Minimum of two (2) hours)" && !selectedCategory.routes && (
                <div className="flex items-center mt-4 sm:mt-0"> {/* mt-4 for mobile stacking, sm:mt-0 for row layout */}
                  <label htmlFor="trip-type-toggle" className="flex items-center cursor-pointer w-max">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          id="trip-type-toggle" 
                          className="sr-only" 
                          checked={tripType === TripType.RETURN} 
                          onChange={() => setTripType(tripType === TripType.ONE_WAY ? TripType.RETURN : TripType.ONE_WAY)} 
                        />
                        <div className="block bg-gray-200 dark:bg-gray-600 w-14 h-8 rounded-full transition"></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${tripType === TripType.RETURN ? 'translate-x-6 !bg-primary-DEFAULT' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-text-light dark:text-text-dark font-medium">
                        {tripType === TripType.RETURN ? 'Return Trip' : 'One-Way Trip'}
                      </div>
                    </label>
                </div>
              )}
            </div>
          </div>
        )}


         {/* Display Currency: Show if a category is selected */}
         {selectedCategoryName && (
          <div>
              <label className={labelClass}>Display Currency:</label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button 
                      onClick={() => setDisplayCurrency(Currency.EC)}
                      className={`flex-1 p-3 text-sm font-medium transition-colors ${displayCurrency === Currency.EC ? 'bg-primary-DEFAULT text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      aria-pressed={displayCurrency === Currency.EC}
                  >
                      EC$
                  </button>
                  <button 
                      onClick={() => setDisplayCurrency(Currency.US)}
                      className={`flex-1 p-3 text-sm font-medium transition-colors ${displayCurrency === Currency.US ? 'bg-primary-DEFAULT text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                      aria-pressed={displayCurrency === Currency.US}
                  >
                      US$
                  </button>
              </div>
          </div>
        )}

        {calculatedFare && calculatedFare.amount > 0 && (
          <div className="mt-8 p-6 bg-primary-light/10 dark:bg-primary-dark/20 rounded-lg text-center" role="status" aria-live="polite">
            <p className="text-sm text-muted-light dark:text-muted-dark mb-1">Estimated Fare:</p>
            <p className="text-4xl font-extrabold text-primary-DEFAULT dark:text-primary-light">
              {calculatedFare.currencySymbol} {calculatedFare.amount.toFixed(2)}
            </p>
            {calculatedFare.details && (
              <p className="text-xs text-muted-light dark:text-muted-dark mt-2">{calculatedFare.details}</p>
            )}
          </div>
        )}
         {calculatedFare && calculatedFare.amount === 0 && calculatedFare.details && (
             <div className="mt-8 p-6 bg-yellow-100 dark:bg-yellow-700 dark:bg-opacity-50 border border-yellow-400 dark:border-yellow-600 rounded-lg text-center" role="alert">
                 <p className="text-yellow-700 dark:text-yellow-300">{calculatedFare.details || "Please complete your selections to see the fare."}</p>
            </div>
        )}
         {calculatedFare === null && selectedCategoryName && (selectedItemKey || destinationSearchInput || (fareMode === 'taxi' && selectedCategory?.category === "Tours around Kingstown (Minimum of two (2) hours)")) && !(fareMode === 'taxi' && !selectedItemKey && selectedCategory?.category !== "Tours around Kingstown (Minimum of two (2) hours)" && destinationSearchInput === '') && (
            <div className="mt-8 p-6 bg-yellow-100 dark:bg-yellow-700 dark:bg-opacity-50 border border-yellow-400 dark:border-yellow-600 rounded-lg text-center" role="alert">
                 <p className="text-yellow-700 dark:text-yellow-300">Calculating fare or more information needed. Please ensure a valid destination is fully selected/entered.</p>
            </div>
        )}
      </div>
    </div>
  );
};