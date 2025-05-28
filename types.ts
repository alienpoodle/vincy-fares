
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum Currency {
  EC = 'EC',
  US = 'US',
}

export enum TripType {
  ONE_WAY = 'one_way',
  RETURN = 'return',
}

// Type 1: Simple Bus Routes
export interface BusRouteItem {
  name: string;
  fare_ec: number;
}
export interface BusRouteCategory {
  category: string;
  routes: BusRouteItem[];
  fares?: undefined; 
}

// Type 2: Standard Taxi Fares (AIA, Kingstown general)
export interface StandardFareItem {
  place: string;
  distance_category?: string;
  regular_ec: number;
  regular_us: number;
  after_hours_ec: number;
  after_hours_us: number;
}
export interface StandardFareCategory {
  category: string;
  fares: StandardFareItem[];
  routes?: undefined; 
}

// Type 3: Cruise Ship / Tour Fares (complex passenger/trip type rules)
export interface CruiseShipFareItem {
  place: string;
  passengers: string; 
  regular_one_way_ec: number;
  regular_one_way_us: number;
  regular_return_ec: number;
  regular_return_us: number;
  after_hours_one_way_ec: number;
  after_hours_one_way_us: number;
}
export interface CruiseShipFareCategory {
  category: string;
  fares: CruiseShipFareItem[];
  routes?: undefined; 
}

// Type 4: Kingstown Tours (simplified structure, return only)
export interface KingstownTourFareItem {
  passengers: string; 
  // No 'place' field here
  regular_return_ec: number;
  regular_return_us: number;
  after_hours_return_ec: number;
  after_hours_return_us: number;
}
export interface KingstownTourFareCategory {
  category: string;
  fares: KingstownTourFareItem[];
  routes?: undefined;
}

export type AnyFareItem = BusRouteItem | StandardFareItem | CruiseShipFareItem | KingstownTourFareItem;

export type FareCategory =
  | BusRouteCategory
  | StandardFareCategory
  | CruiseShipFareCategory
  | KingstownTourFareCategory;

export interface CalculatedFare {
  amount: number;
  currencySymbol: string; // "EC$" or "US$"
  details?: string; 
}
