const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

// GET /api/analytics/top-products/:businessId?window=7|15|30|all
router.get('/top-products/:businessId', authenticateUser, async (req, res) => {
	const { businessId } = req.params;
	const userId = req.user.id;
	const windowParam = (req.query.window || '7').toString().toLowerCase();

	// Determine date threshold
	let days;
	if (windowParam === 'all' || windowParam === 'all-time') {
		days = null;
	} else if (['7', '15', '30'].includes(windowParam)) {
		days = parseInt(windowParam, 10);
	} else {
		return res.status(400).json({ error: 'Invalid window parameter. Use 7, 15, 30, or all' });
	}

	try {
		// Verify business ownership
		const { data: business, error: businessError } = await supabaseAdmin
			.from('businesses')
			.select('id, name, user_id')
			.eq('id', businessId)
			.eq('user_id', userId)
			.single();

		if (businessError || !business) {
			return res.status(403).json({ error: 'Access denied or business not found' });
		}

		// Fetch sales orders for date filtering
		let ordersQuery = supabaseAdmin
			.from('sales_order')
			.select('sales_order_id, order_date')
			.eq('business_id', businessId);

		if (days && Number.isFinite(days)) {
			const since = new Date();
			since.setDate(since.getDate() - days);
			ordersQuery = ordersQuery.gte('order_date', since.toISOString());
		}

		const { data: orders, error: ordersError } = await ordersQuery;
		if (ordersError) {
			return res.status(500).json({ error: 'Failed to load sales orders', details: ordersError });
		}

		if (!orders || orders.length === 0) {
			return res.json({ success: true, window: windowParam, products: [] });
		}

		const orderIdSet = new Set(orders.map(o => o.sales_order_id));
		const orderIdList = Array.from(orderIdSet);

		// Fetch order items
		let itemsQuery = supabaseAdmin
			.from('sales_order_items')
			.select('sales_order_id, product_id, line_total')
			.eq('business_id', businessId);

		if (orderIdList.length > 0) {
			itemsQuery = itemsQuery.in('sales_order_id', orderIdList);
		}

		const { data: items, error: itemsError } = await itemsQuery;
		if (itemsError) {
			return res.status(500).json({ error: 'Failed to load sales order items', details: itemsError });
		}

		if (!items || items.length === 0) {
			return res.json({ success: true, window: windowParam, products: [] });
		}

		// Collect product IDs and fetch product info (name, price)
		const productIds = Array.from(new Set(items.map(it => it.product_id).filter(Boolean)));
		let productInfo = new Map();
		if (productIds.length > 0) {
			const { data: products, error: productsError } = await supabaseAdmin
				.from('product')
				.select('product_id, product_name, selling_price')
				.eq('business_id', businessId)
				.in('product_id', productIds);
			if (!productsError && products) {
				productInfo = new Map(products.map(p => [p.product_id, { name: p.product_name, price: Number(p.selling_price) || 0 }]));
			}
		}

		// Aggregate estimated units sold per product in window
		const productUnits = new Map(); // product_id -> units
		for (const it of items) {
			const price = productInfo.get(it.product_id)?.price || 0;
			const lineTotal = Number(it.line_total) || 0;
			const approxUnits = price > 0 ? Math.max(0, lineTotal / price) : 1; // fallback to 1 unit if price missing
			productUnits.set(it.product_id, (productUnits.get(it.product_id) || 0) + approxUnits);
		}

		const result = Array.from(productUnits.entries())
			.map(([pid, units]) => ({
				product_id: pid,
				product_name: productInfo.get(pid)?.name || pid,
				units_sold: Math.round(units)
			}))
			.sort((a, b) => b.units_sold - a.units_sold)
			.slice(0, 50);

		return res.json({ success: true, window: windowParam, products: result });
	} catch (e) {
		console.error('[ANALYTICS] top-products error:', e);
		return res.status(500).json({ error: 'Failed to compute top products', details: String(e?.message || e) });
	}
});

module.exports = router;
