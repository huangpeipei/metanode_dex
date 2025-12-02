/**
 * Uniswap V3 价格计算工具
 */

// Uniswap V3 的 tick 到价格的转换常数
const Q96 = BigInt(2) ** BigInt(96);
const TICK_BASE = 1.0001;

/**
 * 从 tick 计算价格
 * 公式: price = 1.0001^tick
 * @param tick - Uniswap V3 tick 值
 * @returns 价格（token1/token0）
 */
export function tickToPrice(tick: number): number {
  if (tick === 0) return 1;

  // 使用对数计算避免精度问题
  // price = 1.0001^tick = e^(tick * ln(1.0001))
  const lnBase = Math.log(TICK_BASE);
  const price = Math.exp(tick * lnBase);

  return price;
}

/**
 * 从 sqrtPriceX96 计算价格
 * 公式: price = (sqrtPriceX96 / 2^96)^2
 * @param sqrtPriceX96 - Q64.96 格式的平方根价格（字符串或 BigInt）
 * @returns 价格（token1/token0）
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: string | bigint): number {
  if (!sqrtPriceX96 || sqrtPriceX96 === "0" || sqrtPriceX96 === BigInt(0)) {
    return 0;
  }

  const sqrtPrice =
    typeof sqrtPriceX96 === "string" ? BigInt(sqrtPriceX96) : sqrtPriceX96;

  // 计算 price = (sqrtPriceX96 / 2^96)^2
  // 为了避免精度丢失，先计算 (sqrtPriceX96^2) / (2^96)^2
  const sqrtPriceSquared = sqrtPrice * sqrtPrice;
  const q96Squared = Q96 * Q96;

  // 转换为 JavaScript number（会有精度限制，但对于显示足够）
  // 使用除法并转换为浮点数
  const price = Number(sqrtPriceSquared) / Number(q96Squared);

  return price;
}

/**
 * 格式化价格显示
 * @param price - 价格值
 * @param decimals - 保留小数位数（默认 6）
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 6): string {
  if (price === 0) return "0";
  if (price < 0.000001) return "< 0.000001";
  if (price > 1000000) return price.toExponential(2);

  return price.toFixed(decimals);
}

/**
 * 格式化价格范围
 * @param tickLower - 下界 tick
 * @param tickUpper - 上界 tick
 * @returns 格式化后的价格范围字符串
 */
export function formatPriceRange(tickLower: number, tickUpper: number): string {
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);

  return `${formatPrice(priceLower)} - ${formatPrice(priceUpper)}`;
}

/**
 * 计算并格式化当前价格
 * @param sqrtPriceX96 - Q64.96 格式的平方根价格
 * @returns 格式化后的当前价格字符串
 */
export function formatCurrentPrice(sqrtPriceX96: string | bigint): string {
  const price = sqrtPriceX96ToPrice(sqrtPriceX96);
  return formatPrice(price);
}

/**
 * 获取价格范围的详细信息
 * @param tickLower - 下界 tick
 * @param tickUpper - 上界 tick
 * @returns 包含格式化价格范围的对象
 */
export function getPriceRangeInfo(tickLower: number, tickUpper: number) {
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);

  return {
    priceLower,
    priceUpper,
    formatted: formatPriceRange(tickLower, tickUpper),
    formattedLower: formatPrice(priceLower),
    formattedUpper: formatPrice(priceUpper),
  };
}

/**
 * 获取当前价格的详细信息
 * @param sqrtPriceX96 - Q64.96 格式的平方根价格
 * @returns 包含格式化当前价格的对象
 */
export function getCurrentPriceInfo(sqrtPriceX96: string | bigint) {
  const price = sqrtPriceX96ToPrice(sqrtPriceX96);

  return {
    price,
    formatted: formatCurrentPrice(sqrtPriceX96),
  };
}

/**
 * 从 tick 计算 sqrtPriceX96
 * 公式: sqrtPriceX96 = sqrt(1.0001^tick) * 2^96
 * @param tick - Uniswap V3 tick 值
 * @returns sqrtPriceX96 (BigInt)
 */
export function tickToSqrtPriceX96(tick: number): bigint {
  if (tick === 0) {
    // 当 tick = 0 时，price = 1，sqrtPrice = 1，sqrtPriceX96 = 2^96
    return Q96;
  }

  // price = 1.0001^tick
  // sqrtPrice = sqrt(1.0001^tick) = 1.0001^(tick/2)
  // sqrtPriceX96 = sqrtPrice * 2^96 = 1.0001^(tick/2) * 2^96

  // 使用对数计算避免精度问题
  // sqrtPrice = e^(tick/2 * ln(1.0001))
  const lnBase = Math.log(TICK_BASE);
  const sqrtPrice = Math.exp((tick / 2) * lnBase);

  // 转换为 BigInt，注意精度处理
  // sqrtPriceX96 = sqrtPrice * 2^96
  // 使用高精度计算
  const sqrtPriceX96Float = sqrtPrice * Number(Q96);

  // 转换为 BigInt（注意：这里会有精度损失，但对于大多数情况足够）
  // 更精确的方法需要使用 BigInt 运算，但 JavaScript 的 Math 函数限制了我们
  // 这里使用近似值
  return BigInt(Math.floor(sqrtPriceX96Float));
}
