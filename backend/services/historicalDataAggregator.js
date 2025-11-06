const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

class HistoricalDataAggregator {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    /**
     * Aggregates sales history from sales_order_items into daily summaries
     * @param {string} businessId - Business UUID
     * @returns {Promise<Object>} Aggregation result summary
     */
    async aggregateSalesHistory(businessId) {
        try {
            console.log(`Starting sales history aggregation for business: ${businessId}`);

            // Get all sales data for the business
            const { data: salesData, error } = await this.supabase
                .from('sales_order_items')
                .select(`
                    product_id,
                    line_total,
                    sales_order!inner(
                        order_date,
                        business_id
                    ),
                    product!inner(
                        selling_price
                    )
                `)
                .eq('sales_order.business_id', businessId)
                .order('sales_order.order_date', { ascending: true });

            if (error) {
                throw new Error(`Error fetching sales data: ${error.message}`);
            }

            if (!salesData || salesData.length === 0) {
                console.log('No sales data found for aggregation');
                return { message: 'No sales data to aggregate', aggregatedDays: 0 };
            }

            // Process and aggregate data by product and date
            const aggregatedData = this.processRawSalesData(salesData, businessId);

            // Insert aggregated data into sales_history_aggregated table
            const insertResult = await this.insertAggregatedData(aggregatedData);

            // Calculate seasonal patterns
            await this.calculateSeasonalPatterns(businessId);

            console.log(`Successfully aggregated ${insertResult.count} records`);
            return {
                message: 'Sales history aggregated successfully',
                aggregatedDays: insertResult.count,
                dateRange: {
                    start: insertResult.startDate,
                    end: insertResult.endDate
                }
            };

        } catch (error) {
            console.error('Error in aggregateSalesHistory:', error);
            throw error;
        }
    }

    /**
     * Processes raw sales data into daily aggregated format
     * @param {Array} salesData - Raw sales data from database
     * @param {string} businessId - Business UUID
     * @returns {Array} Processed aggregated data
     */
    processRawSalesData(salesData, businessId) {
        const aggregatedMap = new Map();

        salesData.forEach(item => {
            const orderDate = new Date(item.sales_order.order_date);
            const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            const productId = item.product_id;
            const key = `${dateKey}-${productId}`;

            // Calculate units sold based on line_total and selling_price
            const sellingPrice = item.product.selling_price || 1;
            const unitsSold = Math.round(item.line_total / sellingPrice);

            if (aggregatedMap.has(key)) {
                const existing = aggregatedMap.get(key);
                existing.units_sold += unitsSold;
                existing.revenue += parseFloat(item.line_total);
            } else {
                aggregatedMap.set(key, {
                    business_id: businessId,
                    product_id: productId,
                    date: dateKey,
                    units_sold: unitsSold,
                    revenue: parseFloat(item.line_total),
                    day_of_week: orderDate.getDay() === 0 ? 7 : orderDate.getDay(), // Convert Sunday from 0 to 7
                    is_weekend: orderDate.getDay() === 0 || orderDate.getDay() === 6,
                    month_number: orderDate.getMonth() + 1,
                    quarter_number: Math.ceil((orderDate.getMonth() + 1) / 3),
                    week_of_year: this.getWeekOfYear(orderDate)
                });
            }
        });

        return Array.from(aggregatedMap.values());
    }

    /**
     * Inserts aggregated data into the database
     * @param {Array} aggregatedData - Processed aggregated data
     * @returns {Promise<Object>} Insert result
     */
    async insertAggregatedData(aggregatedData) {
        if (aggregatedData.length === 0) {
            return { count: 0 };
        }

        // First, delete existing aggregated data for the same business and date range
        const dates = aggregatedData.map(item => item.date);
        const minDate = Math.min(...dates.map(d => new Date(d)));
        const maxDate = Math.max(...dates.map(d => new Date(d)));

        await this.supabase
            .from('sales_history_aggregated')
            .delete()
            .eq('business_id', aggregatedData[0].business_id)
            .gte('date', new Date(minDate).toISOString().split('T')[0])
            .lte('date', new Date(maxDate).toISOString().split('T')[0]);

        // Insert new aggregated data
        const { data, error } = await this.supabase
            .from('sales_history_aggregated')
            .insert(aggregatedData)
            .select();

        if (error) {
            throw new Error(`Error inserting aggregated data: ${error.message}`);
        }

        return {
            count: data.length,
            startDate: new Date(minDate).toISOString().split('T')[0],
            endDate: new Date(maxDate).toISOString().split('T')[0]
        };
    }

    /**
     * Identifies seasonal patterns for a business
     * @param {string} businessId - Business UUID
     * @param {string} productId - Optional product ID to analyze specific product
     * @returns {Promise<Object>} Seasonal patterns analysis
     */
    async identifySeasonalPatterns(businessId, productId = null) {
        try {
            let query = this.supabase
                .from('sales_history_aggregated')
                .select('*')
                .eq('business_id', businessId);

            if (productId) {
                query = query.eq('product_id', productId);
            }

            const { data: salesHistory, error } = await query
                .order('date', { ascending: true });

            if (error) {
                throw new Error(`Error fetching sales history: ${error.message}`);
            }

            if (!salesHistory || salesHistory.length < 14) {
                return { message: 'Insufficient data for pattern analysis (minimum 14 days required)' };
            }

            const patterns = {
                weekly: this.analyzeWeeklyPatterns(salesHistory),
                monthly: this.analyzeMonthlyPatterns(salesHistory),
                quarterly: this.analyzeQuarterlyPatterns(salesHistory)
            };

            return {
                businessId,
                productId,
                patterns,
                dataPoints: salesHistory.length,
                analysisDate: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error in identifySeasonalPatterns:', error);
            throw error;
        }
    }

    /**
     * Analyzes weekly patterns (Monday vs Tuesday vs Wednesday, etc.)
     * @param {Array} salesHistory - Historical sales data
     * @returns {Object} Weekly pattern analysis
     */
    analyzeWeeklyPatterns(salesHistory) {
        const weeklyData = {};
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Initialize weekly data structure
        for (let i = 1; i <= 7; i++) {
            weeklyData[i] = { totalUnits: 0, totalRevenue: 0, count: 0, dayName: dayNames[i - 1] };
        }

        // Aggregate data by day of week
        salesHistory.forEach(record => {
            const dayOfWeek = record.day_of_week;
            weeklyData[dayOfWeek].totalUnits += record.units_sold;
            weeklyData[dayOfWeek].totalRevenue += parseFloat(record.revenue);
            weeklyData[dayOfWeek].count++;
        });

        // Calculate averages and multipliers
        const totalAvgUnits = Object.values(weeklyData).reduce((sum, day) => sum + day.totalUnits, 0) / 7;

        const patterns = {};
        Object.entries(weeklyData).forEach(([dayNum, data]) => {
            if (data.count > 0) {
                const avgUnits = data.totalUnits / data.count;
                patterns[data.dayName.toLowerCase()] = {
                    average_units: avgUnits,
                    demand_multiplier: totalAvgUnits > 0 ? avgUnits / totalAvgUnits : 1,
                    confidence: Math.min(data.count / 4, 1), // Higher confidence with more data points
                    data_points: data.count
                };
            }
        });

        return patterns;
    }

    /**
     * Analyzes monthly patterns (January vs February, etc.)
     * @param {Array} salesHistory - Historical sales data
     * @returns {Object} Monthly pattern analysis
     */
    analyzeMonthlyPatterns(salesHistory) {
        const monthlyData = {};
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];

        // Initialize monthly data structure
        for (let i = 1; i <= 12; i++) {
            monthlyData[i] = { totalUnits: 0, totalRevenue: 0, count: 0, monthName: monthNames[i - 1] };
        }

        // Aggregate data by month
        salesHistory.forEach(record => {
            const month = record.month_number;
            monthlyData[month].totalUnits += record.units_sold;
            monthlyData[month].totalRevenue += parseFloat(record.revenue);
            monthlyData[month].count++;
        });

        // Calculate averages and multipliers
        const totalAvgUnits = Object.values(monthlyData).reduce((sum, month) => sum + month.totalUnits, 0) / 12;

        const patterns = {};
        Object.entries(monthlyData).forEach(([monthNum, data]) => {
            if (data.count > 0) {
                const avgUnits = data.totalUnits / data.count;
                patterns[data.monthName] = {
                    average_units: avgUnits,
                    demand_multiplier: totalAvgUnits > 0 ? avgUnits / totalAvgUnits : 1,
                    confidence: Math.min(data.count / 2, 1), // Higher confidence with more data points
                    data_points: data.count
                };
            }
        });

        return patterns;
    }

    /**
     * Analyzes quarterly patterns (Q1 vs Q2 vs Q3 vs Q4)
     * @param {Array} salesHistory - Historical sales data
     * @returns {Object} Quarterly pattern analysis
     */
    analyzeQuarterlyPatterns(salesHistory) {
        const quarterlyData = {};
        const quarterNames = ['q1', 'q2', 'q3', 'q4'];

        // Initialize quarterly data structure
        for (let i = 1; i <= 4; i++) {
            quarterlyData[i] = { totalUnits: 0, totalRevenue: 0, count: 0, quarterName: quarterNames[i - 1] };
        }

        // Aggregate data by quarter
        salesHistory.forEach(record => {
            const quarter = record.quarter_number;
            quarterlyData[quarter].totalUnits += record.units_sold;
            quarterlyData[quarter].totalRevenue += parseFloat(record.revenue);
            quarterlyData[quarter].count++;
        });

        // Calculate averages and multipliers
        const totalAvgUnits = Object.values(quarterlyData).reduce((sum, quarter) => sum + quarter.totalUnits, 0) / 4;

        const patterns = {};
        Object.entries(quarterlyData).forEach(([quarterNum, data]) => {
            if (data.count > 0) {
                const avgUnits = data.totalUnits / data.count;
                patterns[data.quarterName] = {
                    average_units: avgUnits,
                    demand_multiplier: totalAvgUnits > 0 ? avgUnits / totalAvgUnits : 1,
                    confidence: Math.min(data.count / 10, 1), // Higher confidence with more data points
                    data_points: data.count
                };
            }
        });

        return patterns;
    }

    /**
     * Calculates and stores seasonal patterns in the database
     * @param {string} businessId - Business UUID
     * @returns {Promise<void>}
     */
    async calculateSeasonalPatterns(businessId) {
        try {
            // Get unique products for this business
            const { data: products, error } = await this.supabase
                .from('product')
                .select('product_id')
                .eq('business_id', businessId);

            if (error) {
                throw new Error(`Error fetching products: ${error.message}`);
            }

            // Analyze patterns for each product
            for (const product of products) {
                const patterns = await this.identifySeasonalPatterns(businessId, product.product_id);

                if (patterns.patterns) {
                    await this.storeSeasonalPatterns(businessId, product.product_id, patterns.patterns);
                }
            }

        } catch (error) {
            console.error('Error calculating seasonal patterns:', error);
            throw error;
        }
    }

    /**
     * Stores seasonal patterns in the database
     * @param {string} businessId - Business UUID
     * @param {string} productId - Product ID
     * @param {Object} patterns - Calculated patterns
     * @returns {Promise<void>}
     */
    async storeSeasonalPatterns(businessId, productId, patterns) {
        try {
            // Delete existing patterns for this product
            await this.supabase
                .from('seasonal_patterns')
                .delete()
                .eq('business_id', businessId)
                .eq('product_id', productId);

            // Prepare pattern data for insertion
            const patternData = [];

            Object.entries(patterns).forEach(([patternType, typePatterns]) => {
                Object.entries(typePatterns).forEach(([period, data]) => {
                    patternData.push({
                        business_id: businessId,
                        product_id: productId,
                        pattern_type: patternType,
                        period_identifier: period,
                        demand_multiplier: data.demand_multiplier,
                        confidence_level: data.confidence,
                        data_points_count: data.data_points
                    });
                });
            });

            if (patternData.length > 0) {
                const { error } = await this.supabase
                    .from('seasonal_patterns')
                    .insert(patternData);

                if (error) {
                    throw new Error(`Error storing seasonal patterns: ${error.message}`);
                }
            }

        } catch (error) {
            console.error('Error storing seasonal patterns:', error);
            throw error;
        }
    }

    /**
     * Gets the week number of the year for a given date
     * @param {Date} date - Date to get week number for
     * @returns {number} Week number (1-53)
     */
    getWeekOfYear(date) {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    }

    /**
     * Gets aggregated sales history for a specific product and date range
     * @param {string} businessId - Business UUID
     * @param {string} productId - Product ID
     * @param {number} days - Number of days to look back (default: 90)
     * @returns {Promise<Array>} Sales history data
     */
    async getSalesHistory(businessId, productId, days = 90) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.supabase
                .from('sales_history_aggregated')
                .select('*')
                .eq('business_id', businessId)
                .eq('product_id', productId)
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) {
                throw new Error(`Error fetching sales history: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            console.error('Error in getSalesHistory:', error);
            throw error;
        }
    }

    /**
     * Gets seasonal patterns for a specific product
     * @param {string} businessId - Business UUID
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Seasonal patterns
     */
    async getSeasonalPatterns(businessId, productId) {
        try {
            const { data, error } = await this.supabase
                .from('seasonal_patterns')
                .select('*')
                .eq('business_id', businessId)
                .eq('product_id', productId);

            if (error) {
                throw new Error(`Error fetching seasonal patterns: ${error.message}`);
            }

            // Group patterns by type
            const groupedPatterns = {};
            (data || []).forEach(pattern => {
                if (!groupedPatterns[pattern.pattern_type]) {
                    groupedPatterns[pattern.pattern_type] = {};
                }
                groupedPatterns[pattern.pattern_type][pattern.period_identifier] = {
                    demand_multiplier: pattern.demand_multiplier,
                    confidence_level: pattern.confidence_level,
                    data_points_count: pattern.data_points_count
                };
            });

            return groupedPatterns;

        } catch (error) {
            console.error('Error in getSeasonalPatterns:', error);
            throw error;
        }
    }
}

module.exports = HistoricalDataAggregator;