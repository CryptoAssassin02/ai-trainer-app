# trAIner AI Service Tiers - Future Implementation Plan

## Overview
This document outlines the proposed tiered approach for AI request limits in the trAIner app. This will be implemented in future versions once payment structure is determined.

## Tier Structure

### 🚀 trAIner: Foundation (Free Tier)
**Target Users**: New users exploring the platform
**AI Request Limits**:
- Workout Generation: 3 per month
- Plan Adjustments: 5 per month  
- Nutrition Planning: 2 per month
- Analytics Insights: 1 per month
**Features**:
- Basic workout plan generation
- Limited plan modifications
- Basic nutrition recommendations
- Monthly progress summary

### 💪 trAIner: Optimize (Base Paid Tier)
**Target Users**: Regular fitness enthusiasts
**AI Request Limits**:
- Workout Generation: 20 per month
- Plan Adjustments: 50 per month
- Nutrition Planning: 15 per month
- Analytics Insights: 10 per month
**Features**:
- Advanced workout customization
- Unlimited manual plan edits
- Detailed nutrition planning
- Weekly AI-powered insights
- Export/import functionality

### 🏆 trAIner: Evolve (Premium Tier)
**Target Users**: Serious athletes and fitness professionals
**AI Request Limits**:
- Workout Generation: Unlimited
- Plan Adjustments: Unlimited
- Nutrition Planning: Unlimited
- Analytics Insights: Unlimited
**Features**:
- Complete AI customization
- Priority AI processing
- Advanced analytics and predictions
- Professional-grade reporting
- API access for third-party integrations

## Implementation Considerations

### Rate Limiting Strategy
```javascript
// Future implementation in backend/middleware/aiTierLimits.js
const tierLimits = {
  foundation: {
    workoutGeneration: { limit: 3, window: 'monthly' },
    planAdjustments: { limit: 5, window: 'monthly' },
    nutritionPlanning: { limit: 2, window: 'monthly' },
    analyticsInsights: { limit: 1, window: 'monthly' }
  },
  optimize: {
    workoutGeneration: { limit: 20, window: 'monthly' },
    planAdjustments: { limit: 50, window: 'monthly' },
    nutritionPlanning: { limit: 15, window: 'monthly' },
    analyticsInsights: { limit: 10, window: 'monthly' }
  },
  evolve: {
    // Unlimited - no rate limiting beyond basic abuse prevention
    workoutGeneration: { limit: 10000, window: 'monthly' },
    planAdjustments: { limit: 10000, window: 'monthly' },
    nutritionPlanning: { limit: 10000, window: 'monthly' },
    analyticsInsights: { limit: 10000, window: 'monthly' }
  }
};
```

### Database Schema Extensions
```sql
-- Future table: user_subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IN ('foundation', 'optimize', 'evolve')) DEFAULT 'foundation',
  subscription_start TIMESTAMPTZ DEFAULT now(),
  subscription_end TIMESTAMPTZ,
  ai_requests_used JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Future table: ai_request_tracking
CREATE TABLE ai_request_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'workout_generation', 'plan_adjustment', etc.
  request_date TIMESTAMPTZ DEFAULT now(),
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  user_tier TEXT,
  INDEX(user_id, request_type, request_date)
);
```

### Cost Analysis Framework
```javascript
// Future implementation: backend/services/ai-cost-tracking.js
class AICostTracker {
  static calculateMonthlyCosts(tier, usage) {
    // Calculate expected OpenAI costs per tier
    // Foundation: ~$2-5/month per active user
    // Optimize: ~$10-20/month per active user  
    // Evolve: ~$30-100/month per active user
  }
  
  static projectedRevenue(userCounts) {
    // Calculate break-even point for each tier
    // Factor in OpenAI costs, infrastructure, development
  }
}
```

## Business Rationale

### Foundation Tier
- **Purpose**: User acquisition and product validation
- **Economics**: Loss leader to demonstrate value
- **Conversion**: Gateway to paid tiers

### Optimize Tier  
- **Purpose**: Core revenue stream for typical users
- **Economics**: Profitable margin after AI costs
- **Features**: Complete value proposition for most users

### Evolve Tier
- **Purpose**: High-value users and professionals
- **Economics**: Premium pricing for unlimited access
- **Features**: Professional-grade capabilities

## Future Implementation Timeline

**Phase 1** (Post-MVP): Basic tier recognition and limits
**Phase 2**: Payment integration and subscription management  
**Phase 3**: Advanced analytics and tier-specific features
**Phase 4**: API access and professional integrations

---

*This document will be updated as payment structure and pricing strategy are finalized.* 