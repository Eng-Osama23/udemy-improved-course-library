/**
 * Udemy Course Scoring Engine
 * Credibility-aware, Bayesian algorithm for AI Efficiency Score calculation
 * Version: 3.1 (Fairness Edition - Backward Compatible)
 */

/**
 * Sigmoid function for smooth credibility curve
 * RESTORED: Kept for script.js compatibility, but made the curve fairer 
 * so it reaches high credibility at 500 reviews instead of 1000+.
 * @param {number} reviewCount - Number of reviews/ratings
 * @returns {number} Credibility multiplier (0-1)
 */
function calculateReviewCredibility(reviewCount) {
  if (reviewCount < 5) return 0.2;
  if (reviewCount >= 500) return 1;
  
  // Fairer sigmoid: faster ramp up
  return 1 / (1 + Math.exp(-0.015 * (reviewCount - 250)));
}

/**
 * Calculate rating score using a Bayesian Average
 * @param {number} rating - Star rating (0-5)
 * @param {number} reviewCount - Number of reviews
 * @returns {number} Score contribution (0-35)
 */
function calculateRatingScore(rating, reviewCount) {
  if (rating === 0 || !rating) return 0;
  
  // Bayesian Formula prevents single 5-star reviews from beating 10,000 4.7-star reviews
  const avgRating = 4.3; 
  const threshold = 500; 
  const bayesianRating = ((avgRating * threshold) + (rating * reviewCount)) / (threshold + reviewCount);
  
  // Scale rating to a score (Max 35 points)
  if (bayesianRating < 3.5) return Math.round((bayesianRating / 5) * 10);
  
  const normalizedBonus = (bayesianRating - 3.5) / 1.5; 
  return Math.round(15 + (normalizedBonus * 20));
}

/**
 * Calculate freshness score with a fair, extended decay curve
 * @param {number} ageInDays - Days since last update
 * @returns {number} Score contribution (0-15)
 */
function calculateFreshnessScore(ageInDays) {
  if (ageInDays < 0 || !ageInDays) ageInDays = 0;
  
  // Softer decay: Day 0 = 15pts | 1 Year = ~10pts | 3 Years = ~5pts
  const decayFactor = Math.exp(-ageInDays / 1000);
  const score = 15 * decayFactor;
  
  return Math.max(1, Math.round(score));
}

/**
 * Calculate engagement score based on logarithmic market proof
 * @param {number} enrolledCount - Total enrolled students
 * @param {number} reviewCount - Total reviews/ratings
 * @returns {number} Score contribution (0-25)
 */
function calculateEngagementScore(enrolledCount, reviewCount) {
  if (!enrolledCount || enrolledCount === 0) return 0;
  
  // Logarithmic scale for enrollment (Max 20 points at ~100,000 students)
  const enrollmentLog = Math.min(Math.max(Math.log10(enrolledCount), 0), 5);
  let score = (enrollmentLog / 5) * 20;
  
  // Engagement ratio bonus (Max 5 points) to reward real interaction
  const engagementRatio = reviewCount / enrolledCount;
  if (engagementRatio >= 0.10) score += 5;
  else if (engagementRatio >= 0.05) score += 3;
  else if (engagementRatio >= 0.01) score += 1;
  
  return Math.round(score);
}

/**
 * Calculate efficiency score based on course runtime and digestibility
 * @param {number} runtimeHours - Total video runtime in hours
 * @param {number} lectureCount - Number of lectures
 * @returns {number} Score contribution (0-25)
 */
function calculateEfficiencyScore(runtimeHours, lectureCount) {
  if (!runtimeHours || runtimeHours === 0) return 10; // Exam baseline
  
  let score = 0;
  
  // 1. Duration Value (Max 15 points) - Rewards both deep-dives and standard courses
  if (runtimeHours > 40) score += 15;
  else if (runtimeHours >= 10) score += 15;
  else if (runtimeHours >= 4) score += 12;
  else if (runtimeHours >= 1.5) score += 8;
  else score += 4;
  
  // 2. Digestibility Value (Max 10 points) - Rewards 3-10 min average video length
  if (lectureCount && lectureCount > 0) {
    const avgMinutes = (runtimeHours * 60) / lectureCount;
    if (avgMinutes >= 3 && avgMinutes <= 10) score += 10; // Perfect sweet spot
    else if (avgMinutes > 10 && avgMinutes <= 20) score += 7;
    else if (avgMinutes > 20) score += 4; // Videos are too long
    else score += 6; // < 3 mins, a bit fragmented
  } else {
    score += 5;
  }
  
  return Math.min(25, Math.round(score));
}

/**
 * Calculate overall AI Efficiency Score (0-100)
 * @param {Object} courseData - Course metrics object
 * @returns {number} AI Efficiency Score (0-100)
 */
function calculateOverallScore(courseData) {
  // Failsafe to prevent "Course info configuration missing" crash
  if (!courseData || typeof courseData !== 'object') return 0;

  const {
    rating = 0,
    reviewCount = 0,
    enrolledCount = 0,
    runtimeSeconds = 0,
    lectureCount = 0,
    ageInDays = 9999,
    isExam = false
  } = courseData;
  
  const runtimeHours = (runtimeSeconds || 0) / 3600;
  
  if (isExam) {
    // Exam courses: Math normalized to 100 points based on relevant metrics
    const ratingScore = (calculateRatingScore(rating, reviewCount) / 35) * 50;
    const freshnessScore = (calculateFreshnessScore(ageInDays) / 15) * 30;
    const engagementScore = (calculateEngagementScore(enrolledCount, reviewCount) / 25) * 20;
    
    return Math.min(100, Math.max(0, Math.round(ratingScore + freshnessScore + engagementScore)));
  }
  
  // Regular video courses: Balanced perfectly to 100 points
  const ratingScore = calculateRatingScore(rating, reviewCount);              // Max 35
  const freshnessScore = calculateFreshnessScore(ageInDays);                  // Max 15
  const engagementScore = calculateEngagementScore(enrolledCount, reviewCount); // Max 25
  const efficiencyScore = calculateEfficiencyScore(runtimeHours, lectureCount); // Max 25
  
  let totalScore = ratingScore + freshnessScore + engagementScore + efficiencyScore;
  
  return Math.min(100, Math.max(0, Math.round(totalScore)));
}

/**
 * Get score color based on efficiency score
 * @param {number} score - AI Efficiency Score (0-100)
 * @returns {string} Hex color code
 */
function getScoreColor(score) {
  if (score >= 85) return '#06b6d4';  // Cyan
  if (score >= 70) return '#8b5cf6';  // Violet
  if (score >= 50) return '#f59e0b';  // Amber
  return '#ef4444';                   // Red
}

/**
 * Get score category label
 * @param {number} score - AI Efficiency Score (0-100)
 * @returns {string} Category label
 */
function getScoreCategory(score) {
  if (score >= 85) return 'Top Tier Course';
  if (score >= 70) return 'Solid Quality';
  if (score >= 50) return 'Average/Niche';
  return 'Not Recommended';
}

/**
 * Get card background gradient based on score
 * @param {number} score - AI Efficiency Score (0-100)
 * @param {boolean} isExam - Whether course is an exam/practice test
 * @returns {Object} Contains bg, border, shadow CSS values
 */
function getCardStyling(score, isExam = false) {
  if (isExam) {
    return {
      background: 'linear-gradient(135deg, #fff7ed, #fffaf5)',
      border: '2px solid #f59e0b',
      shadow: '0 8px 20px rgba(245,158,11,0.3)'
    };
  }
  
  if (score >= 85) {
    return {
      background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)',
      border: '1px solid #a7f3d0',
      shadow: '0 6px 16px rgba(6,182,212,0.12)'
    };
  }
  
  if (score >= 70) {
    return {
      background: 'linear-gradient(135deg, #f3f0ff, #f5f3ff)',
      border: '1px solid #d8b4fe',
      shadow: '0 6px 16px rgba(139,92,246,0.08)'
    };
  }
  
  if (score >= 50) {
    return {
      background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
      border: '1px solid #fcd34d',
      shadow: '0 6px 16px rgba(245,158,11,0.08)'
    };
  }
  
  return {
    background: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
    border: '1px solid #fca5a5',
    shadow: '0 6px 16px rgba(239,68,68,0.08)'
  };
}

/**
 * Export functions for use in script.js
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateRatingScore,
    calculateFreshnessScore,
    calculateEngagementScore,
    calculateEfficiencyScore,
    calculateOverallScore,
    getScoreColor,
    getScoreCategory,
    getCardStyling,
    calculateReviewCredibility // Restored!
  };
}