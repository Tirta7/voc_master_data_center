export const getConversionFactor = (fromUnit: string, toUnit: string): number => {
    if (!fromUnit || !toUnit) return 1;
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) return 1;

    // Special handling for Portion (used in sub-recipes)
    if (fromUnit.toLowerCase() === 'portion') return 1;

    const units: Record<string, Record<string, number>> = {
        'Gram': { 'Kg': 0.001, 'Gram': 1 },
        'Kg': { 'Gram': 1000, 'Kg': 1 },
        'Ml': { 'Liter': 0.001, 'Ml': 1 },
        'Liter': { 'Ml': 1000, 'Liter': 1 },
    };
    if (units[fromUnit] && units[fromUnit][toUnit]) return units[fromUnit][toUnit];
    return 1;
};
