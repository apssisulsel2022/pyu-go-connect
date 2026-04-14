/**
 * PriceCalculator Unit Tests
 * Tests: Static price calculation methods
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PriceCalculator } from '@/utils/PriceCalculator';

describe('PriceCalculator', () => {
  describe('calculateBaseAmount', () => {
    it('should calculate base amount correctly', () => {
      const result = PriceCalculator.calculateBaseAmount(100000, 1.0);
      expect(result).toBe(100000);
    });

    it('should apply multiplier correctly', () => {
      const result = PriceCalculator.calculateBaseAmount(100000, 1.5);
      expect(result).toBe(150000);
    });

    it('should handle decimal multipliers', () => {
      const result = PriceCalculator.calculateBaseAmount(100000, 1.2);
      expect(result).toBe(120000);
    });

    it('should return 0 for zero base amount', () => {
      const result = PriceCalculator.calculateBaseAmount(0, 1.5);
      expect(result).toBe(0);
    });
  });

  describe('calculateDistanceCharge', () => {
    it('should calculate distance charge correctly', () => {
      const result = PriceCalculator.calculateDistanceCharge(50, 2000);
      expect(result).toBe(100000);
    });

    it('should handle float distances', () => {
      const result = PriceCalculator.calculateDistanceCharge(50.5, 2000);
      expect(result).toBe(101000);
    });

    it('should handle zero distance', () => {
      const result = PriceCalculator.calculateDistanceCharge(0, 2000);
      expect(result).toBe(0);
    });

    it('should work with different cost per km', () => {
      const result = PriceCalculator.calculateDistanceCharge(30, 5000);
      expect(result).toBe(150000);
    });
  });

  describe('calculateRayonSurcharge', () => {
    it('should calculate base surcharge for 1 seat', () => {
      const result = PriceCalculator.calculateRayonSurcharge(5000, 1);
      expect(result).toBe(5000);
    });

    it('should increase surcharge for multiple seats', () => {
      const result = PriceCalculator.calculateRayonSurcharge(5000, 4);
      expect(result).toBe(20000);
    });

    it('should handle zero surcharge', () => {
      const result = PriceCalculator.calculateRayonSurcharge(0, 5);
      expect(result).toBe(0);
    });

    it('should scale with seat count', () => {
      const result1 = PriceCalculator.calculateRayonSurcharge(10000, 2);
      const result2 = PriceCalculator.calculateRayonSurcharge(10000, 4);
      expect(result2).toBe(result1 * 2);
    });
  });

  describe('applyPeakHoursMultiplier', () => {
    it('should not modify subtotal if multiplier is 1.0', () => {
      const result = PriceCalculator.applyPeakHoursMultiplier(500000, 1.0);
      expect(result).toBe(500000);
    });

    it('should apply peak multiplier correctly', () => {
      const result = PriceCalculator.applyPeakHoursMultiplier(500000, 1.2);
      expect(result).toBe(600000);
    });

    it('should handle high peak multipliers', () => {
      const result = PriceCalculator.applyPeakHoursMultiplier(500000, 1.5);
      expect(result).toBe(750000);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate complete price breakdown', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 1,
        baseFareMultiplier: 1.0,
        distanceCostPerKm: 2000,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 5000,
      });

      expect(result.baseAmount).toBe(100000);
      expect(result.distanceAmount).toBe(100000); // 50 * 2000
      expect(result.rayonSurcharge).toBe(5000);
      expect(result.peakHoursMultiplier).toBe(1.0);
      expect(result.totalAmount).toBe(205000); // 100 + 100 + 5
    });

    it('should handle premium service with peak hours', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 4,
        baseFareMultiplier: 1.5,
        distanceCostPerKm: 5000,
        peakHoursMultiplier: 1.2,
        rayonBaseSurcharge: 10000,
      });

      expect(result.baseAmount).toBe(100000); 
      expect(result.servicePremium).toBe(50000); // 100000 * 0.5
      expect(result.distanceAmount).toBe(250000); // 50 * 5000
      expect(result.rayonSurcharge).toBe(40000); // 10000 * 4
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it('should include service premium in breakdown', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 1,
        baseFareMultiplier: 1.2,
        distanceCostPerKm: 2000,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 5000,
      });

      expect(result.servicePremium).toBe(20000); // (100000 * 0.2)
    });

    it('should return breakdown array with all components', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 1,
        baseFareMultiplier: 1.0,
        distanceCostPerKm: 2000,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 5000,
      });

      expect(result.breakdown).toBeDefined();
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(result.breakdown.length).toBeGreaterThan(0);
      expect(result.breakdown.some(item => item.label === 'TOTAL')).toBe(true);
    });
  });

  describe('verifyPrice', () => {
    it('should verify exact prices', () => {
      const result = PriceCalculator.verifyPrice(100000, 100000);
      expect(result).toBe(true);
    });

    it('should allow 1 Rp tolerance', () => {
      expect(PriceCalculator.verifyPrice(100000, 100000)).toBe(true);
      expect(PriceCalculator.verifyPrice(100000, 100001)).toBe(true);
      expect(PriceCalculator.verifyPrice(100000, 99999)).toBe(true);
    });

    it('should reject prices beyond tolerance', () => {
      expect(PriceCalculator.verifyPrice(100000, 100002)).toBe(false);
      expect(PriceCalculator.verifyPrice(100000, 99998)).toBe(false);
    });

    it('should reject significantly different prices', () => {
      expect(PriceCalculator.verifyPrice(100000, 150000)).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('should format price in IDR', () => {
      const result = PriceCalculator.formatPrice(100000);
      expect(result).toBe('Rp 100.000');
    });

    it('should handle large amounts', () => {
      const result = PriceCalculator.formatPrice(5000000);
      expect(result).toBe('Rp 5.000.000');
    });

    it('should handle zero', () => {
      const result = PriceCalculator.formatPrice(0);
      expect(result).toBe('Rp 0');
    });

    it('should handle negative numbers', () => {
      const result = PriceCalculator.formatPrice(-10000);
      expect(result).toBe('Rp -10.000');
    });

    it('should handle large amounts with decimals', () => {
      const result = PriceCalculator.formatPrice(1250000.5);
      expect(result).toBe('Rp 1.250.001'); // assuming rounding
    });

    it('should not display decimal places', () => {
      const result = PriceCalculator.formatPrice(100000.75);
      expect(result).not.toContain(',');
    });
  });

  describe('getPriceBreakdown', () => {
    it('should return array of breakdown items', () => {
      const calculatedPrice = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 1,
        baseFareMultiplier: 1.0,
        distanceCostPerKm: 2000,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 5000,
      });

      const breakdown = PriceCalculator.getPriceBreakdown(calculatedPrice);
      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown.length).toBeGreaterThan(0);
    });

    it('should include label and amount in each item', () => {
      const calculatedPrice = PriceCalculator.calculateTotal({
        routeFare: 100000,
        distanceKm: 50,
        seatCount: 1,
        baseFareMultiplier: 1.0,
        distanceCostPerKm: 2000,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 5000,
      });

      const breakdown = PriceCalculator.getPriceBreakdown(calculatedPrice);
      breakdown.forEach(item => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('amount');
        expect(typeof item.amount).toBe('number');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero everything in calculateTotal', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 0,
        distanceKm: 0,
        seatCount: 1,
        baseFareMultiplier: 1.0,
        distanceCostPerKm: 0,
        peakHoursMultiplier: 1.0,
        rayonBaseSurcharge: 0,
      });
      expect(result.totalAmount).toBe(0);
    });

    it('should handle very large numbers in calculateTotal', () => {
      const result = PriceCalculator.calculateTotal({
        routeFare: 100000000,
        distanceKm: 10000,
        seatCount: 10,
        baseFareMultiplier: 2.0,
        distanceCostPerKm: 10000,
        peakHoursMultiplier: 2.0,
        rayonBaseSurcharge: 100000,
      });
      expect(result.totalAmount).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalAmount)).toBe(true);
    });
  });
});
