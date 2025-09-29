import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Product data structure
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  inStock: boolean;
}

// Cart item structure
interface CartItem extends Product {
  quantity: number;
}

// Address structure
interface Address {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

// Product database
const PRODUCTS: Product[] = [
  // FARM EQUIPMENT & TOOLS
  { id: 'shovel-1', name: 'Heavy Duty Shovel', category: 'equipment', price: 450, image: '/shop/shovel.jpg', description: 'Durable steel shovel for digging and soil work', inStock: true },
  { id: 'rake-1', name: 'Garden Rake', category: 'equipment', price: 320, image: '/shop/rake.jpg', description: 'Multi-purpose rake for soil preparation', inStock: true },
  { id: 'hoe-1', name: 'Farming Hoe', category: 'equipment', price: 280, image: '/shop/hoe.jpg', description: 'Traditional hoe for weeding and cultivation', inStock: true },
  { id: 'sickle-1', name: 'Sharp Sickle', category: 'equipment', price: 180, image: '/shop/sickle.jpg', description: 'Curved blade sickle for harvesting crops', inStock: true },
  { id: 'sprinkler-1', name: 'Rotary Sprinkler', category: 'equipment', price: 1250, image: '/shop/sprinkler.jpg', description: 'Automatic rotary sprinkler system', inStock: true },
  { id: 'pump-1', name: 'Water Pump 1HP', category: 'equipment', price: 8500, image: '/shop/pump.jpg', description: 'Electric water pump for irrigation', inStock: true },

  // SEEDS & PLANTING MATERIAL
  { id: 'rice-seeds', name: 'Basmati Rice Seeds', category: 'seeds', price: 120, image: '/shop/rice-seeds.jpg', description: 'Premium quality basmati rice seeds - 1kg', inStock: true },
  { id: 'wheat-seeds', name: 'Wheat Seeds', category: 'seeds', price: 85, image: '/shop/wheat-seeds.jpg', description: 'High yield wheat variety seeds - 1kg', inStock: true },
  { id: 'tomato-seeds', name: 'Hybrid Tomato Seeds', category: 'seeds', price: 450, image: '/shop/tomato-seeds.jpg', description: 'Disease resistant hybrid tomato seeds - 100g', inStock: true },
  { id: 'potato-seeds', name: 'Potato Tubers', category: 'seeds', price: 45, image: '/shop/potato-seeds.jpg', description: 'Certified potato seed tubers - 1kg', inStock: true },
  { id: 'mango-plants', name: 'Mango Saplings', category: 'seeds', price: 250, image: '/shop/mango-plant.jpg', description: 'Grafted mango saplings - 1 plant', inStock: true },
  { id: 'watermelon-seeds', name: 'Watermelon Seeds', category: 'seeds', price: 350, image: '/shop/watermelon-seeds.jpg', description: 'Sweet watermelon hybrid seeds - 50g', inStock: true },

  // FERTILIZERS & PESTICIDES
  { id: 'npk-fertilizer', name: 'NPK 19:19:19', category: 'fertilizer', price: 580, image: '/shop/npk-fertilizer.jpg', description: 'Balanced NPK fertilizer - 1kg pack', inStock: true },
  { id: 'vermicompost', name: 'Vermicompost', category: 'fertilizer', price: 180, image: '/shop/vermicompost.jpg', description: 'Organic vermicompost - 5kg bag', inStock: true },
  { id: 'biochar', name: 'Biochar Soil Amendment', category: 'fertilizer', price: 220, image: '/shop/biochar.jpg', description: 'Carbon-rich biochar for soil health - 2kg', inStock: true },
  { id: 'pesticide-1', name: 'Organic Pesticide', category: 'fertilizer', price: 380, image: '/shop/pesticide.jpg', description: 'Neem-based organic pesticide - 500ml', inStock: true },
  { id: 'herbicide-1', name: 'Weed Killer', category: 'fertilizer', price: 450, image: '/shop/herbicide.jpg', description: 'Selective herbicide for weeds - 250ml', inStock: true },
  { id: 'fungicide-1', name: 'Fungal Control', category: 'fertilizer', price: 320, image: '/shop/fungicide.jpg', description: 'Broad spectrum fungicide - 100g', inStock: true },

  // FARM INPUTS & CONSUMABLES
  { id: 'poly-sheet', name: 'Polythene Sheet', category: 'inputs', price: 150, image: '/shop/poly-sheet.jpg', description: 'Transparent polythene sheet - 10x5 feet', inStock: true },
  { id: 'grow-bags', name: 'Grow Bags Set', category: 'inputs', price: 280, image: '/shop/grow-bags.jpg', description: 'Fabric grow bags - Set of 5 (12 inch)', inStock: true },
  { id: 'jute-bags', name: 'Jute Storage Bags', category: 'inputs', price: 65, image: '/shop/jute-bags.jpg', description: 'Natural jute storage bags - 50kg capacity', inStock: true },
  { id: 'hdpe-bags', name: 'HDPE Storage Bags', category: 'inputs', price: 45, image: '/shop/hdpe-bags.jpg', description: 'Heavy duty HDPE bags - 25kg capacity', inStock: true },

  // MAINTENANCE & WORKSHOP ITEMS
  { id: 'grease-1', name: 'Multi-Purpose Grease', category: 'maintenance', price: 120, image: '/shop/grease.jpg', description: 'High quality machinery grease - 500g', inStock: true },
  { id: 'lubricant-1', name: 'Engine Oil', category: 'maintenance', price: 380, image: '/shop/engine-oil.jpg', description: '15W-40 engine oil for farm equipment - 1L', inStock: true },
  { id: 'gloves-1', name: 'Work Gloves', category: 'maintenance', price: 85, image: '/shop/gloves.jpg', description: 'Cotton work gloves - 1 pair', inStock: true },
  { id: 'boots-1', name: 'Rubber Boots', category: 'maintenance', price: 450, image: '/shop/boots.jpg', description: 'Waterproof rubber boots - Size 8', inStock: true },
  { id: 'mask-1', name: 'Safety Masks', category: 'maintenance', price: 25, image: '/shop/mask.jpg', description: 'Dust protection masks - Pack of 5', inStock: true },
  { id: 'raincoat-1', name: 'Rain Coat', category: 'maintenance', price: 320, image: '/shop/raincoat.jpg', description: 'Heavy duty rain coat - Size L', inStock: true },
];

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'equipment', name: 'Farm Equipment & Tools', icon: '🛠️' },
  { id: 'seeds', name: 'Seeds & Planting', icon: '🌾' },
  { id: 'fertilizer', name: 'Fertilizers & Pesticides', icon: '🧪' },
  { id: 'inputs', name: 'Farm Inputs & Consumables', icon: '📦' },
  { id: 'maintenance', name: 'Maintenance & Workshop', icon: '🔧' },
];

export default function Shop() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shop-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [address, setAddress] = useState<Address>({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('shop-cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Filter products by category
  const filteredProducts = selectedCategory === 'all' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = () => {
    // Validate address
    if (!address.name || !address.phone || !address.address || !address.city || !address.state || !address.pincode) {
      alert('Please fill in all address fields');
      return;
    }

    // Simulate order placement
    setOrderPlaced(true);
    setCart([]);
    setShowCheckout(false);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setOrderPlaced(false);
    }, 3000);
  };

  return (
    <motion.div 
      className="shop-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header with cart */}
      <motion.div 
        className="card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>🛒 Farm Shop</h2>
            <p className="muted">Quality farming supplies delivered to your doorstep</p>
          </div>
          <motion.button
            className="secondary"
            onClick={() => setShowCart(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ position: 'relative' }}
          >
            🛒 Cart ({cartItemCount})
            {cartItemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: 'var(--red-500)',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 'bold'
              }}>
                {cartItemCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Category Filter */}
      <motion.div 
        className="card"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((category) => (
            <motion.button
              key={category.id}
              className={selectedCategory === category.id ? '' : 'secondary'}
              onClick={() => setSelectedCategory(category.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ fontSize: 14 }}
            >
              {category.icon} {category.name}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Products Grid */}
      <motion.div 
        className="products-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}
      >
        <AnimatePresence>
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <img 
                  src={product.image} 
                  alt={product.name}
                  style={{ 
                    width: '100%', 
                    height: 180, 
                    objectFit: 'cover', 
                    borderRadius: 8,
                    background: 'var(--green-50)'
                  }}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180" viewBox="0 0 280 180"><rect width="280" height="180" fill="%23f0fdf4"/><text x="140" y="95" text-anchor="middle" font-family="Arial" font-size="16" fill="%2316a34a">${product.name}</text></svg>`;
                  }}
                />
                {!product.inStock && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'var(--red-500)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    Out of Stock
                  </div>
                )}
              </div>
              
              <h4 style={{ margin: '0 0 8px 0' }}>{product.name}</h4>
              <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
                {product.description}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--green-600)' }}>
                  ₹{product.price.toLocaleString()}
                </span>
                <motion.button
                  className={product.inStock ? '' : 'secondary'}
                  disabled={!product.inStock}
                  onClick={() => product.inStock && addToCart(product)}
                  whileHover={product.inStock ? { scale: 1.05 } : {}}
                  whileTap={product.inStock ? { scale: 0.95 } : {}}
                  style={{ fontSize: 14 }}
                >
                  {product.inStock ? '🛒 Add to Cart' : 'Out of Stock'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCart(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <motion.div
              className="card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ 
                width: '100%', 
                maxWidth: 600, 
                maxHeight: '80vh', 
                overflow: 'auto' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>🛒 Your Cart</h3>
                <button 
                  className="secondary" 
                  onClick={() => setShowCart(false)}
                  style={{ padding: '8px 12px' }}
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
                  Your cart is empty. Add some products to get started!
                </p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div 
                      key={item.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        padding: '16px 0',
                        borderBottom: '1px solid var(--border-color)' 
                      }}
                    >
                      <img 
                        src={item.image} 
                        alt={item.name}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="%23f0fdf4"/></svg>`;
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: '0 0 4px 0' }}>{item.name}</h5>
                        <p className="muted" style={{ fontSize: 14, margin: 0 }}>₹{item.price}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button 
                          className="secondary"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ padding: '4px 8px', fontSize: 14 }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 30, textAlign: 'center' }}>{item.quantity}</span>
                        <button 
                          className="secondary"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ padding: '4px 8px', fontSize: 14 }}
                        >
                          +
                        </button>
                        <button 
                          className="danger"
                          onClick={() => removeFromCart(item.id)}
                          style={{ padding: '4px 8px', fontSize: 14, marginLeft: 8 }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ padding: '20px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 'bold' }}>Total:</span>
                      <span style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--green-600)' }}>
                        ₹{cartTotal.toLocaleString()}
                      </span>
                    </div>
                    <motion.button
                      className=""
                      onClick={() => {
                        setShowCart(false);
                        setShowCheckout(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ width: '100%' }}
                    >
                      Proceed to Checkout
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCheckout(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <motion.div
              className="card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ 
                width: '100%', 
                maxWidth: 500, 
                maxHeight: '80vh', 
                overflow: 'auto' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>📦 Checkout</h3>
                <button 
                  className="secondary" 
                  onClick={() => setShowCheckout(false)}
                  style={{ padding: '8px 12px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4>Delivery Address</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  />
                  <textarea
                    placeholder="Address"
                    value={address.address}
                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                    rows={3}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="City"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="PIN Code"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20, padding: 16, background: 'var(--green-50)', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Order Summary</h4>
                <div style={{ fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Items ({cartItemCount})</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Delivery</span>
                    <span className="text-success">Free</span>
                  </div>
                  <hr style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 16 }}>
                    <span>Total</span>
                    <span>₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <motion.button
                className=""
                onClick={placeOrder}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ width: '100%' }}
              >
                🚚 Place Order (Cash on Delivery)
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {orderPlaced && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <motion.div
              className="card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ 
                width: '100%', 
                maxWidth: 400,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--green-600)' }}>Order Placed Successfully!</h3>
              <p className="muted">
                Your order will be delivered within 2-3 business days. 
                You will pay cash on delivery.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}