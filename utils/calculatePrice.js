const calculateCleaningPrice = (bedrooms, bathrooms) => {
    const basePrice = 150; // Base price for 1 bed, 1 bath
    const extraBedroomCost = 35; // Cost per extra bedroom
    const extraBathroomCost = 25; // Cost per extra bathroom
  
    // Calculate additional costs
    const extraBedrooms = Math.max(bedrooms - 1, 0) * extraBedroomCost;
    const extraBathrooms = Math.max(bathrooms - 1, 0) * extraBathroomCost;
  
    return basePrice + extraBedrooms + extraBathrooms;
  };
  
  module.exports = calculateCleaningPrice;
  