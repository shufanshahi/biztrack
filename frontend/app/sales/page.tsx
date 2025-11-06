"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Minus, ShoppingCart, User, Package, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface Customer {
  customer_id: number;
  customer_name: string;
  email: string;
  phone: string;
  customer_type: string;
}

interface Product {
  product_id: string;
  product_name: string;
  selling_price: number;
  price: number;
  status: string;
  category_id: number;
  brand_id: number;
  product_category?: { category_name: string };
  product_brand?: { brand_name: string };
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function RecordSalePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
    customer_type: 'regular'
  });
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBusinesses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBusiness) {
      fetchCustomers();
      fetchProducts();
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async () => {
    try {
      setLoadingBusinesses(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/businesses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch businesses');

      const data = await response.json();
      setBusinesses(data.businesses || []);

      // Auto-select first business if available
      if (data.businesses && data.businesses.length > 0) {
        setSelectedBusiness(data.businesses[0].id);
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sales/customers/${selectedBusiness}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sales/products/${selectedBusiness}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) {
      toast.error('Please select a product and valid quantity');
      return;
    }

    const product = products.find(p => p.product_id === selectedProductId);
    if (!product) return;

    const existingItem = cart.find(item => item.product_id === selectedProductId);
    if (existingItem) {
      // Update quantity
      setCart(cart.map(item =>
        item.product_id === selectedProductId
          ? {
              ...item,
              quantity: item.quantity + quantity,
              line_total: (item.quantity + quantity) * item.unit_price
            }
          : item
      ));
    } else {
      // Add new item
      const newItem: CartItem = {
        product_id: product.product_id,
        product_name: product.product_name,
        quantity,
        unit_price: product.selling_price,
        line_total: quantity * product.selling_price
      };
      setCart([...cart, newItem]);
    }

    setSelectedProductId('');
    setQuantity(1);
    toast.success('Product added to cart');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? {
            ...item,
            quantity: newQuantity,
            line_total: newQuantity * item.unit_price
          }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.line_total, 0);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sales/customers/${selectedBusiness}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCustomerData)
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers([...customers, data.customer]);
        setSelectedCustomerId(data.customer.customer_id.toString());
        setIsNewCustomer(false);
        setNewCustomerData({
          customer_name: '',
          email: '',
          phone: '',
          billing_address: '',
          shipping_address: '',
          customer_type: 'regular'
        });
        toast.success('Customer created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const handleSubmitSale = async () => {
    if (!selectedCustomerId && !isNewCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (cart.length === 0) {
      toast.error('Please add at least one product to the cart');
      return;
    }

    if (isNewCustomer && !newCustomerData.customer_name.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    setLoading(true);

    try {
      let customerId = selectedCustomerId;

      // Create new customer if needed
      if (isNewCustomer) {
        const token = localStorage.getItem('access_token');
        const customerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sales/customers/${selectedBusiness}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newCustomerData)
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          customerId = customerData.customer.customer_id.toString();
        } else {
          throw new Error('Failed to create customer');
        }
      }

      // Create sales order
      const token = localStorage.getItem('access_token');
      const saleData = {
        customer_id: parseInt(customerId),
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        shipping_address: shippingAddress || null
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sales/${selectedBusiness}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        toast.success('Sale recorded successfully!');
        // Reset form
        setSelectedCustomerId('');
        setIsNewCustomer(false);
        setNewCustomerData({
          customer_name: '',
          email: '',
          phone: '',
          billing_address: '',
          shipping_address: '',
          customer_type: 'regular'
        });
        setCart([]);
        setShippingAddress('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record sale');
      }
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Business Selector */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Record Sale</h1>
                <p className="text-sm text-muted-foreground">Create a new sales transaction</p>
              </div>
            </div>

            {/* Business Selector */}
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-muted-foreground" />
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="px-4 py-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[200px]"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {!selectedBusiness ? (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please select a business to record a sale
              </p>
            </CardContent>
          </Card>
        ) : (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Select an existing customer or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={!isNewCustomer ? "default" : "outline"}
                  onClick={() => setIsNewCustomer(false)}
                  className="flex-1"
                >
                  Existing Customer
                </Button>
                <Button
                  variant={isNewCustomer ? "default" : "outline"}
                  onClick={() => setIsNewCustomer(true)}
                  className="flex-1"
                >
                  New Customer
                </Button>
              </div>

              {!isNewCustomer ? (
                <div>
                  <Label htmlFor="customer">Select Customer</Label>
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Choose a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_id.toString()}>
                        {customer.customer_name} {customer.email && `(${customer.email})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={newCustomerData.customer_name}
                      onChange={(e) => setNewCustomerData({...newCustomerData, customer_name: e.target.value})}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                        placeholder="customer@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="billing_address">Billing Address</Label>
                    <Textarea
                      id="billing_address"
                      value={newCustomerData.billing_address}
                      onChange={(e) => setNewCustomerData({...newCustomerData, billing_address: e.target.value})}
                      placeholder="Enter billing address"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_address">Shipping Address</Label>
                    <Textarea
                      id="shipping_address"
                      value={newCustomerData.shipping_address}
                      onChange={(e) => setNewCustomerData({...newCustomerData, shipping_address: e.target.value})}
                      placeholder="Enter shipping address"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_type">Customer Type</Label>
                    <select
                      id="customer_type"
                      value={newCustomerData.customer_type}
                      onChange={(e) => setNewCustomerData({...newCustomerData, customer_type: e.target.value})}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="regular">Regular</option>
                      <option value="premium">Premium</option>
                      <option value="wholesale">Wholesale</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="order_shipping">Shipping Address for Order</Label>
                <Textarea
                  id="order_shipping"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter shipping address for this order"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection and Cart */}
          <div className="space-y-6">
            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Add Products
                </CardTitle>
                <CardDescription>
                  Select products and quantities for this sale
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product">Select Product</Label>
                  <select
                    id="product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Choose a product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name} - ${product.selling_price}
                        {product.product_brand && ` (${product.product_brand.brand_name})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button onClick={handleAddToCart} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in cart</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">${item.unit_price} each</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.line_total.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.product_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={handleSubmitSale}
                        disabled={loading}
                        className="flex-1"
                        size="lg"
                      >
                        {loading ? 'Recording Sale...' : 'Record Sale'}
                      </Button>
                      {isNewCustomer && (
                        <Button
                          variant="outline"
                          onClick={handleCreateCustomer}
                          disabled={!newCustomerData.customer_name.trim()}
                        >
                          Create Customer Only
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}