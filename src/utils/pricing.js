/**
 * Sistema Centralizado de Precios, Descuentos y Ofertas Relámpago
 * Garantiza consistencia matemática en todo el marketplace:
 * ProductCard, ProductModal, ProductCatalog, CartContext, FlashOffersPage, HomePage y Admin.
 */

export function calculateProductPricing(product) {
  if (!product) {
    return {
      rawPrice: 0,
      rawOldPrice: 0,
      finalPrice: 0,
      oldPrice: 0,
      hasDiscount: false,
      discountPerc: 0,
      baseValuation: 0,
      isFlashOffer: false,
      endTime: 0
    };
  }

  // Preservamos el precio base real de Firestore aunque el producto ya haya sido clonado
  const rawPrice = Number(product._rawPrice ?? product.price ?? product.precio ?? 0) || 0;
  const rawOldPrice = Number(product._rawOldPrice ?? product.oldPrice ?? product.precioAnterior ?? 0) || 0;

  // Detección de expiración de oferta relámpago
  let endTime = product.parsedOfferEndsAt || 0;
  if (!endTime) {
    if (product.offerEndsAt) {
      endTime = product.offerEndsAt?.toMillis ? product.offerEndsAt.toMillis() : new Date(product.offerEndsAt).getTime();
      if (endTime < 100000) endTime = (product.createdAtMs || Date.now()) + (endTime * 60 * 60 * 1000);
    } else if (product.horas || product.duracion || product.hours) {
      endTime = (product.createdAtMs || Date.now()) + (Number(product.horas || product.duracion || product.hours) * 60 * 60 * 1000);
    }
  }

  const isFlashOffer = endTime > Date.now();

  // Porcentaje de descuento: oferta flash activa o descuento configurado
  let extraDiscountPerc = 0;
  if (isFlashOffer && (product.offerDiscount || product.discount)) {
    extraDiscountPerc = Number(product.offerDiscount || product.discount || 0);
  } else {
    extraDiscountPerc = Number(product.discount || product.offerDiscount || 0);
  }

  // Precio final matemático
  const finalPrice = extraDiscountPerc > 0
    ? Number((rawPrice - (rawPrice * (extraDiscountPerc / 100))).toFixed(2))
    : rawPrice;

  // Precio tachado a mostrar (oldPrice)
  const displayOldPrice = rawOldPrice > rawPrice
    ? rawOldPrice
    : (extraDiscountPerc > 0 && rawPrice > finalPrice ? rawPrice : 0);

  const hasDiscount = (displayOldPrice > finalPrice) || (isFlashOffer && extraDiscountPerc > 0);

  // Porcentaje efectivo total a mostrar en la etiqueta
  let discountPerc = 0;
  if (displayOldPrice > finalPrice && displayOldPrice > 0) {
    discountPerc = Math.round(((displayOldPrice - finalPrice) / displayOldPrice) * 100);
  } else if (extraDiscountPerc > 0) {
    discountPerc = Math.round(extraDiscountPerc);
  }

  return {
    rawPrice,
    rawOldPrice,
    finalPrice,
    oldPrice: displayOldPrice,
    hasDiscount,
    discountPerc,
    baseValuation: Math.max(rawPrice, rawOldPrice, finalPrice),
    isFlashOffer,
    endTime
  };
}

/**
 * Prepara un producto con su precio final exacto y etiquetas de origen
 * para evitar discrepancias cuando entra a la bolsa de compras.
 */
export function prepareProductForCart(product, customOrigin = null) {
  const pricing = calculateProductPricing(product);
  const origenVentaActual = customOrigin ||
    product._origenVenta ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("origenVenta") : null) ||
    "tienda_directa";

  return {
    ...product,
    price: pricing.finalPrice,
    oldPrice: pricing.oldPrice > pricing.finalPrice ? pricing.oldPrice : null,
    _rawPrice: pricing.rawPrice,
    _rawOldPrice: pricing.rawOldPrice,
    _origenVenta: origenVentaActual
  };
}
