const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Groq client
const groq = axios.create({
    baseURL: 'https://api.groq.com/openai/v1',
    headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

console.log('[CUSTOMER INSIGHTS ROUTES] Customer insights routes module loaded');

/**
 * GET /api/customer-insights/analyze/:businessId
 * Run AI-powered customer insights analysis with RFM segmentation
 */
router.get('/analyze/:businessId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS ANALYZE] Starting analysis for businessId: ${req.params.businessId}, userId: ${req.user.id}`);
    
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Verifying business ownership...`);
        // Verify business belongs to user
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] Business verification failed:`, businessError);
            return res.status(404).json({ error: 'Business not found' });
        }
        console.log(`[CUSTOMER INSIGHTS ANALYZE] Business verified: ${business.name}`);

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching RFM segmentation data...`);
        // Fetch RFM data
        const { data: rfmData, error: rfmError } = await supabase
            .from('vw_customer_rfm')
            .select('*')
            .eq('business_id', businessId)
            .order('monetary_value', { ascending: false });

        if (rfmError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] RFM data fetch failed:`, rfmError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] RFM data fetched: ${rfmData?.length || 0} customers`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching at-risk customers...`);
        // Fetch at-risk customers
        const { data: atRiskData, error: atRiskError } = await supabase
            .from('vw_at_risk_customers')
            .select('*')
            .eq('business_id', businessId)
            .order('churn_risk_score', { ascending: false })
            .limit(20);

        if (atRiskError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] At-risk data fetch failed:`, atRiskError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] At-risk customers fetched: ${atRiskData?.length || 0} customers`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching segment statistics...`);
        // Fetch segment statistics
        const { data: segmentStats, error: segmentError } = await supabase
            .from('vw_top_customers_by_segment')
            .select('*')
            .eq('business_id', businessId)
            .order('total_segment_revenue', { ascending: false });

        if (segmentError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] Segment stats fetch failed:`, segmentError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] Segment stats fetched: ${segmentStats?.length || 0} segments`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching customer lifetime value data...`);
        // Fetch customer lifetime value
        const { data: clvData, error: clvError } = await supabase
            .from('vw_customer_lifetime_value')
            .select('*')
            .eq('business_id', businessId)
            .order('total_clv', { ascending: false })
            .limit(20);

        if (clvError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] CLV data fetch failed:`, clvError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] CLV data fetched: ${clvData?.length || 0} customers`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching purchase behavior data...`);
        // Fetch purchase behavior
        const { data: behaviorData, error: behaviorError } = await supabase
            .from('vw_customer_purchase_behavior')
            .select('*')
            .eq('business_id', businessId)
            .limit(20);

        if (behaviorError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] Behavior data fetch failed:`, behaviorError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] Behavior data fetched: ${behaviorData?.length || 0} customers`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Fetching engagement trends...`);
        // Fetch engagement trends
        const { data: trendsData, error: trendsError } = await supabase
            .from('vw_customer_engagement_trends')
            .select('*')
            .eq('business_id', businessId)
            .order('purchase_month', { ascending: false })
            .limit(50);

        if (trendsError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] Trends data fetch failed:`, trendsError);
        } else {
            console.log(`[CUSTOMER INSIGHTS ANALYZE] Trends data fetched: ${trendsData?.length || 0} records`);
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Building AI prompt...`);
        // Build prompt for Groq - Summarize data to reduce payload size
        const rfmSummary = rfmData?.slice(0, 15).map(r => ({
            customer_name: r.customer_name,
            segment: r.rfm_segment,
            recency_days: r.recency_days,
            frequency: r.frequency_count,
            monetary: r.monetary_value,
            churn_risk: r.churn_risk_score,
            avg_order: r.avg_order_value
        })) || [];

        const atRiskSummary = atRiskData?.slice(0, 10).map(a => ({
            customer_name: a.customer_name,
            segment: a.rfm_segment,
            recency_days: a.recency_days,
            last_purchase: a.last_purchase_date,
            total_value: a.monetary_value,
            churn_risk: a.churn_risk_score
        })) || [];

        const segmentSummary = segmentStats?.map(s => ({
            segment: s.rfm_segment,
            count: s.customer_count,
            revenue: s.total_segment_revenue,
            avg_value: s.avg_customer_value,
            avg_frequency: s.avg_purchase_frequency,
            avg_recency: s.avg_days_since_purchase
        })) || [];

        const prompt = `You are an advanced AI customer relationship management expert specializing in retention, engagement, and RFM analysis. Analyze the following business data and provide actionable customer insights.

**Business Context:**
- Business: ${business.name}
- Total Customers: ${rfmData?.length || 0}
- At-Risk Customers: ${atRiskData?.length || 0}
- Total CLV: $${clvData?.reduce((sum, c) => sum + (c.total_clv || 0), 0).toFixed(2) || 0}

**RFM Segmentation Summary (Top 15 Customers):**
${rfmSummary.map(r => `- ${r.customer_name}: ${r.segment} | Recency: ${r.recency_days}d | Frequency: ${r.frequency} | Value: $${r.monetary} | Churn Risk: ${r.churn_risk}%`).join('\n')}

**Segment Statistics:**
${segmentSummary.map(s => `- ${s.segment}: ${s.count} customers, $${s.revenue} revenue, Avg: $${s.avg_value}/customer, ${s.avg_frequency} purchases, ${s.avg_recency} days since last`).join('\n')}

**At-Risk Customers (Top 10):**
${atRiskSummary.map(a => `- ${a.customer_name}: ${a.segment} | ${a.recency_days} days since last purchase | Total Value: $${a.total_value} | Churn Risk: ${a.churn_risk}%`).join('\n')}

**Engagement Trends:**
${trendsData?.slice(0, 5).map(t => `- Customer ${t.customer_id}: ${t.spending_trend} (${t.spend_change_percentage.toFixed(1)}% change), $${t.monthly_spend} this month`).join('\n') || 'Limited trend data available'}

**Your Tasks:**

1. **Customer Segmentation Insights**: For each major RFM segment (Champions, Loyal, At Risk, Lost), provide:
   - Key characteristics
   - Retention strategies
   - Engagement recommendations

2. **Churn Prevention Strategy**: For at-risk and lost customers:
   - Identify top 10 customers to prioritize (by CLV and churn risk)
   - Personalized win-back strategies
   - Recommended discount percentages (5-30%)
   - Email campaign suggestions (subject line + key message)

3. **Upsell/Cross-sell Opportunities**: For Champions and Loyal customers:
   - Premium product recommendations
   - Bundle opportunities
   - Loyalty reward suggestions

4. **Engagement Campaigns**: Design 3-5 automated campaigns:
   - Target segment
   - Campaign type (retention, winback, upsell, loyalty)
   - Email subject and body template
   - Discount/offer details
   - Expected outcome

5. **Customer Lifetime Value Optimization**: Strategies to increase CLV:
   - Increase purchase frequency
   - Increase average order value
   - Reduce churn rate

6. **Personalized Actions**: For top 5 at-risk customers, provide:
   - Individual customer name
   - Specific action (email content, discount, product recommendation)
   - Reason/rationale

**Output Format (STRICT JSON):**
{
  "segment_insights": [
    {
      "segment": "string",
      "customer_count": number,
      "total_revenue": number,
      "characteristics": "string",
      "retention_strategy": "string",
      "engagement_actions": ["string"]
    }
  ],
  "churn_prevention": [
    {
      "customer_id": number,
      "customer_name": "string",
      "rfm_segment": "string",
      "churn_risk_score": number,
      "priority": "high|medium|low",
      "win_back_strategy": "string",
      "suggested_discount": number,
      "email_subject": "string",
      "email_preview": "string",
      "rationale": "string"
    }
  ],
  "upsell_opportunities": [
    {
      "customer_id": number,
      "customer_name": "string",
      "current_value": number,
      "upsell_potential": number,
      "recommended_products": ["string"],
      "strategy": "string",
      "email_subject": "string"
    }
  ],
  "engagement_campaigns": [
    {
      "campaign_name": "string",
      "campaign_type": "retention|winback|upsell|loyalty",
      "target_segment": "string",
      "target_customer_count": number,
      "email_subject": "string",
      "email_body": "string",
      "discount_percentage": number,
      "expected_conversion_rate": number,
      "expected_revenue": number,
      "priority": "high|medium|low",
      "rationale": "string"
    }
  ],
  "clv_optimization": {
    "increase_frequency": ["string"],
    "increase_aov": ["string"],
    "reduce_churn": ["string"],
    "expected_clv_increase": number
  },
  "personalized_actions": [
    {
      "customer_name": "string",
      "customer_id": number,
      "action_type": "email|discount|call|personalized_offer",
      "specific_action": "string",
      "email_content": "string",
      "recommended_products": ["string"],
      "discount": number,
      "rationale": "string"
    }
  ],
  "summary": {
    "total_customers_analyzed": number,
    "high_priority_actions": number,
    "estimated_revenue_at_risk": number,
    "estimated_revenue_opportunity": number,
    "key_insights": ["string"],
    "immediate_actions": ["string"]
  }
}

Return ONLY valid JSON, no markdown or explanations.`;

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Prompt built - Length: ${prompt.length} characters`);
        console.log(`[CUSTOMER INSIGHTS ANALYZE] Calling Groq API...`);
        // Call Groq API
        const groqResponse = await groq.post('/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise customer relationship management AI expert. Always return valid JSON only with actionable insights.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
            max_tokens: 8000
        });

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Groq API response received`);
        const aiResponse = groqResponse.data.choices[0].message.content;
        
        console.log(`[CUSTOMER INSIGHTS ANALYZE] Parsing AI response...`);
        // Parse AI response
        let insightsResults;
        try {
            // Try to extract JSON if wrapped in markdown
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                insightsResults = JSON.parse(jsonMatch[0]);
            } else {
                insightsResults = JSON.parse(aiResponse);
            }
            console.log(`[CUSTOMER INSIGHTS ANALYZE] AI response parsed successfully`);
        } catch (parseError) {
            console.error(`[CUSTOMER INSIGHTS ANALYZE] Failed to parse AI response:`, parseError);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                rawResponse: aiResponse.substring(0, 500)
            });
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Processing insights for storage...`);
        // Store results in database
        const insightRecords = [];
        
        console.log(`[CUSTOMER INSIGHTS ANALYZE] Storing churn prevention insights...`);
        // Store churn prevention insights
        if (insightsResults.churn_prevention) {
            for (const churn of insightsResults.churn_prevention) {
                // Find customer_id from rfmData
                const customer = rfmData?.find(r => r.customer_name === churn.customer_name);
                if (customer) {
                    insightRecords.push({
                        business_id: businessId,
                        customer_id: customer.customer_id,
                        insight_type: 'churn_prevention',
                        rfm_segment: churn.rfm_segment || customer.rfm_segment,
                        churn_risk_score: churn.churn_risk_score,
                        recommendation: churn.win_back_strategy,
                        suggested_action: churn.rationale,
                        suggested_discount: churn.suggested_discount,
                        email_subject: churn.email_subject,
                        email_body: churn.email_preview,
                        campaign_priority: churn.priority,
                        confidence_score: 0.85
                    });
                }
            }
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Storing upsell opportunities...`);
        // Store upsell opportunities
        if (insightsResults.upsell_opportunities) {
            for (const upsell of insightsResults.upsell_opportunities) {
                const customer = rfmData?.find(r => r.customer_name === upsell.customer_name);
                if (customer) {
                    insightRecords.push({
                        business_id: businessId,
                        customer_id: customer.customer_id,
                        insight_type: 'upsell',
                        rfm_segment: customer.rfm_segment,
                        churn_risk_score: customer.churn_risk_score,
                        recommendation: upsell.strategy,
                        suggested_action: `Upsell potential: $${upsell.upsell_potential}`,
                        recommended_products: upsell.recommended_products,
                        email_subject: upsell.email_subject,
                        campaign_priority: 'medium',
                        confidence_score: 0.75
                    });
                }
            }
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Storing personalized actions...`);
        // Store personalized actions
        if (insightsResults.personalized_actions) {
            for (const action of insightsResults.personalized_actions) {
                const customer = rfmData?.find(r => r.customer_name === action.customer_name);
                if (customer) {
                    insightRecords.push({
                        business_id: businessId,
                        customer_id: customer.customer_id,
                        insight_type: 'engagement',
                        rfm_segment: customer.rfm_segment,
                        churn_risk_score: customer.churn_risk_score,
                        recommendation: action.specific_action,
                        suggested_action: action.rationale,
                        suggested_discount: action.discount,
                        recommended_products: action.recommended_products,
                        email_body: action.email_content,
                        campaign_priority: 'high',
                        confidence_score: 0.90
                    });
                }
            }
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Saving ${insightRecords.length} insights to database...`);
        // Save to database
        if (insightRecords.length > 0) {
            const { data: insertedInsights, error: insertError } = await supabase
                .from('customer_insights')
                .insert(insightRecords)
                .select();

            if (insertError) {
                console.error(`[CUSTOMER INSIGHTS ANALYZE] Failed to save insights:`, insertError);
            } else {
                console.log(`[CUSTOMER INSIGHTS ANALYZE] Successfully saved ${insertedInsights?.length || 0} insights`);
            }
        }

        console.log(`[CUSTOMER INSIGHTS ANALYZE] Returning results to client...`);
        // Return results
        res.json({
            success: true,
            business_name: business.name,
            analysis_date: new Date().toISOString(),
            insights: insightsResults,
            rfm_data: rfmData,
            segment_statistics: segmentStats,
            at_risk_customers: atRiskData,
            metadata: {
                total_customers: rfmData?.length || 0,
                at_risk_count: atRiskData?.length || 0,
                insights_saved: insightRecords.length,
                ai_model: 'llama-3.1-8b-instant'
            }
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS ANALYZE] Error:', error);
        res.status(500).json({
            error: 'Failed to analyze customer insights',
            message: error.message
        });
    }
});

/**
 * GET /api/customer-insights/results/:businessId
 * Get stored customer insights for a business
 */
router.get('/results/:businessId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS RESULTS] Fetching results for businessId: ${req.params.businessId}, userId: ${req.user.id}`);
    
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch stored insights
        const { data: insights, error: insightsError } = await supabase
            .from('customer_insights')
            .select(`
                *,
                customer:customer_id (
                    customer_name,
                    email,
                    phone
                )
            `)
            .eq('business_id', businessId)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (insightsError) {
            console.error(`[CUSTOMER INSIGHTS RESULTS] Error fetching insights:`, insightsError);
            return res.status(500).json({ error: 'Failed to fetch insights' });
        }

        // Group by insight type
        const groupedInsights = {
            churn_prevention: insights.filter(i => i.insight_type === 'churn_prevention'),
            upsell: insights.filter(i => i.insight_type === 'upsell'),
            engagement: insights.filter(i => i.insight_type === 'engagement'),
            retention: insights.filter(i => i.insight_type === 'retention')
        };

        res.json({
            success: true,
            business_name: business.name,
            total_insights: insights.length,
            insights: groupedInsights,
            all_insights: insights
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS RESULTS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
});

/**
 * GET /api/customer-insights/segments/:businessId
 * Get RFM segment statistics for a business
 */
router.get('/segments/:businessId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS SEGMENTS] Fetching segments for businessId: ${req.params.businessId}, userId: ${req.user.id}`);
    
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch segment statistics
        const { data: segments, error: segmentError } = await supabase
            .from('vw_top_customers_by_segment')
            .select('*')
            .eq('business_id', businessId)
            .order('total_segment_revenue', { ascending: false });

        if (segmentError) {
            console.error(`[CUSTOMER INSIGHTS SEGMENTS] Error:`, segmentError);
            return res.status(500).json({ error: 'Failed to fetch segments' });
        }

        // Fetch individual customer RFM data
        const { data: customers, error: customerError } = await supabase
            .from('vw_customer_rfm')
            .select('*')
            .eq('business_id', businessId)
            .order('monetary_value', { ascending: false });

        if (customerError) {
            console.error(`[CUSTOMER INSIGHTS SEGMENTS] Error fetching customers:`, customerError);
        }

        res.json({
            success: true,
            business_name: business.name,
            segments: segments,
            customers: customers,
            total_customers: customers?.length || 0,
            total_revenue: customers?.reduce((sum, c) => sum + (c.monetary_value || 0), 0) || 0
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS SEGMENTS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch segment data' });
    }
});

/**
 * GET /api/customer-insights/at-risk/:businessId
 * Get at-risk customers for a business
 */
router.get('/at-risk/:businessId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS AT-RISK] Fetching at-risk customers for businessId: ${req.params.businessId}`);
    
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch at-risk customers
        const { data: atRiskCustomers, error: atRiskError } = await supabase
            .from('vw_at_risk_customers')
            .select('*')
            .eq('business_id', businessId)
            .order('churn_risk_score', { ascending: false });

        if (atRiskError) {
            console.error(`[CUSTOMER INSIGHTS AT-RISK] Error:`, atRiskError);
            return res.status(500).json({ error: 'Failed to fetch at-risk customers' });
        }

        // Calculate statistics
        const totalAtRisk = atRiskCustomers?.length || 0;
        const totalRevenueAtRisk = atRiskCustomers?.reduce((sum, c) => sum + (c.monetary_value || 0), 0) || 0;
        const highRiskCount = atRiskCustomers?.filter(c => c.churn_risk_score >= 70).length || 0;

        res.json({
            success: true,
            business_name: business.name,
            at_risk_customers: atRiskCustomers,
            statistics: {
                total_at_risk: totalAtRisk,
                high_risk_count: highRiskCount,
                total_revenue_at_risk: totalRevenueAtRisk,
                avg_churn_risk: totalAtRisk > 0 ? 
                    (atRiskCustomers.reduce((sum, c) => sum + c.churn_risk_score, 0) / totalAtRisk) : 0
            }
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS AT-RISK] Error:', error);
        res.status(500).json({ error: 'Failed to fetch at-risk customers' });
    }
});

/**
 * GET /api/customer-insights/customer/:businessId/:customerId
 * Get detailed information about a specific customer
 */
router.get('/customer/:businessId/:customerId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS DETAIL] Fetching customer ${req.params.customerId} for businessId: ${req.params.businessId}`);
    
    try {
        const { businessId, customerId } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch customer RFM data
        const { data: rfmData, error: rfmError } = await supabase
            .from('vw_customer_rfm')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .single();

        if (rfmError) {
            console.error(`[CUSTOMER INSIGHTS DETAIL] RFM error:`, rfmError);
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Fetch customer purchase behavior
        const { data: behaviorData, error: behaviorError } = await supabase
            .from('vw_customer_purchase_behavior')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .single();

        // Fetch customer CLV
        const { data: clvData, error: clvError } = await supabase
            .from('vw_customer_lifetime_value')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .single();

        // Fetch recent orders
        const { data: recentOrders, error: ordersError } = await supabase
            .from('sales_order')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .order('order_date', { ascending: false })
            .limit(10);

        // Fetch product recommendations
        const { data: recommendations, error: recError } = await supabase
            .from('vw_customer_product_recommendations')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .limit(5);

        // Fetch stored insights for this customer
        const { data: insights, error: insightsError } = await supabase
            .from('customer_insights')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        // Fetch engagement trends
        const { data: trends, error: trendsError } = await supabase
            .from('vw_customer_engagement_trends')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .order('purchase_month', { ascending: false })
            .limit(6);

        res.json({
            success: true,
            business_name: business.name,
            customer: {
                ...rfmData,
                behavior: behaviorData,
                clv: clvData,
                recent_orders: recentOrders || [],
                recommendations: recommendations || [],
                insights: insights || [],
                trends: trends || []
            }
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS DETAIL] Error:', error);
        res.status(500).json({ error: 'Failed to fetch customer details' });
    }
});

/**
 * GET /api/customer-insights/segment-customers/:businessId/:segment
 * Get list of customers in a specific RFM segment
 */
router.get('/segment-customers/:businessId/:segment', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS SEGMENT CUSTOMERS] Fetching ${req.params.segment} customers for businessId: ${req.params.businessId}`);
    
    try {
        const { businessId, segment } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch customers in segment
        const { data: customers, error: customersError } = await supabase
            .from('vw_customer_rfm')
            .select('*')
            .eq('business_id', businessId)
            .eq('rfm_segment', segment)
            .order('monetary_value', { ascending: false });

        if (customersError) {
            console.error(`[CUSTOMER INSIGHTS SEGMENT CUSTOMERS] Error:`, customersError);
            return res.status(500).json({ error: 'Failed to fetch segment customers' });
        }

        // Calculate segment statistics
        const totalRevenue = customers?.reduce((sum, c) => sum + (c.monetary_value || 0), 0) || 0;
        const avgRevenue = customers?.length > 0 ? totalRevenue / customers.length : 0;
        const avgFrequency = customers?.length > 0 
            ? customers.reduce((sum, c) => sum + c.frequency_count, 0) / customers.length 
            : 0;
        const avgRecency = customers?.length > 0 
            ? customers.reduce((sum, c) => sum + c.recency_days, 0) / customers.length 
            : 0;

        res.json({
            success: true,
            business_name: business.name,
            segment: segment,
            customers: customers,
            statistics: {
                total_customers: customers?.length || 0,
                total_revenue: totalRevenue,
                avg_revenue: avgRevenue,
                avg_frequency: avgFrequency,
                avg_recency: avgRecency
            }
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS SEGMENT CUSTOMERS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch segment customers' });
    }
});

/**
 * POST /api/customer-insights/campaigns
 * Create a new customer engagement campaign
 */
router.post('/campaigns', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS CAMPAIGNS] Creating new campaign for userId: ${req.user.id}`);
    
    try {
        const {
            business_id,
            campaign_name,
            campaign_type,
            target_segment,
            target_customers,
            email_subject,
            email_template,
            discount_percentage,
            status,
            scheduled_at
        } = req.body;

        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', business_id)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Create campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('customer_campaigns')
            .insert({
                business_id,
                campaign_name,
                campaign_type,
                target_segment,
                target_customers,
                email_subject,
                email_template,
                discount_percentage,
                status: status || 'draft',
                scheduled_at: scheduled_at || null
            })
            .select()
            .single();

        if (campaignError) {
            console.error(`[CUSTOMER INSIGHTS CAMPAIGNS] Error creating campaign:`, campaignError);
            return res.status(500).json({ error: 'Failed to create campaign' });
        }

        console.log(`[CUSTOMER INSIGHTS CAMPAIGNS] Campaign created successfully: ${campaign.campaign_id}`);
        res.json({
            success: true,
            campaign
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS CAMPAIGNS] Error:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

/**
 * GET /api/customer-insights/campaigns/:businessId
 * Get all campaigns for a business
 */
router.get('/campaigns/:businessId', authenticateUser, async (req, res) => {
    console.log(`[CUSTOMER INSIGHTS CAMPAIGNS] Fetching campaigns for businessId: ${req.params.businessId}`);
    
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify business ownership
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .eq('user_id', userId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Fetch campaigns
        const { data: campaigns, error: campaignsError } = await supabase
            .from('customer_campaigns')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (campaignsError) {
            console.error(`[CUSTOMER INSIGHTS CAMPAIGNS] Error:`, campaignsError);
            return res.status(500).json({ error: 'Failed to fetch campaigns' });
        }

        res.json({
            success: true,
            business_name: business.name,
            campaigns
        });

    } catch (error) {
        console.error('[CUSTOMER INSIGHTS CAMPAIGNS] Error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

module.exports = router;
