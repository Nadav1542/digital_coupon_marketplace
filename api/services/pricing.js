/**
 * Pricing engine — all pricing logic lives here.
 * minimum_sell_price = cost_price × (1 + margin_percentage / 100)
 */

/**
 * Compute minimum sell price from cost and margin.
 * @param {number} costPrice - Must be >= 0
 * @param {number} marginPercentage - Must be >= 0
 * @returns {number} The computed minimum sell price, rounded to 2 decimals
 */
function computeMinimumSellPrice(costPrice, marginPercentage) {
  if (costPrice < 0) throw new Error('cost_price must be >= 0');
  if (marginPercentage < 0) throw new Error('margin_percentage must be >= 0');
  return +(costPrice * (1 + marginPercentage / 100)).toFixed(2);
}

/**
 * Validate that a reseller price meets the minimum.
 * @param {number} resellerPrice - Price the reseller wants to pay
 * @param {number} minimumSellPrice - The computed floor price
 * @returns {boolean}
 */
function isResellerPriceValid(resellerPrice, minimumSellPrice) {
  return resellerPrice >= minimumSellPrice;
}

module.exports = {
  computeMinimumSellPrice,
  isResellerPriceValid
};
