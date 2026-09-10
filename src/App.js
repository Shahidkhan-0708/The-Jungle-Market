// Jungle Market - React Native Root Application
// Multi-Portal Architecture: Artiste/Artisan, Buyer, Field Ambassador (3 Core Portals)
// Modern Luxury & Earthy Tribal Sanctuary Design System

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { THEME } from './theme/theme';
import { JUNGLE_DATA } from './data/jungleData';

// Artisan Screens
import {
  ArtisanDashboardScreen,
  ArtisanSellingWorkflowScreen,
  ArtisanOrdersScreen,
  ArtisanAmountScreen,
  ArtisanGuildScreen
} from './screens/ArtisanScreens';

// Buyer Screens
import {
  BuyerHomeScreen,
  BuyerCategoriesScreen,
  ProductDetailScreen,
  CheckoutScreen,
  OrderSuccessScreen,
  BuyerOrdersScreen,
  BulkBuyingScreen,
  BuyerProfileScreen
} from './screens/BuyerScreens';

// Ambassador Screens
import {
  AmbassadorDashboardScreen,
  AmbassadorVerificationScreen,
  AmbassadorNetworkScreen,
  AmbassadorReportsScreen
} from './screens/AmbassadorScreens';

export default function App() {
  // Role State: strictly 3 portals: 'artisan' | 'buyer' | 'ambassador'
  const [role, setRole] = useState('artisan');

  // Navigation State per portal
  const [artisanTab, setArtisanTab] = useState('dashboard');
  const [buyerTab, setBuyerTab] = useState('home');
  const [ambassadorTab, setAmbassadorTab] = useState('queue');

  // Shared Data State
  const [products, setProducts] = useState(JUNGLE_DATA.products || []);
  const [orders, setOrders] = useState(JUNGLE_DATA.orders || JUNGLE_DATA.activeOrders || []);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [verifyingItem, setVerifyingItem] = useState(null);

  // Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cart Handlers
  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.title}" to basket.`);
  };

  const handleUpdateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Place Order
  const handlePlaceOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    setIsCartModalOpen(false);
    setBuyerTab('order_success');
    showToast(`Order ${newOrder.id} placed successfully on ONDC.`);
  };

  // Artisan Publish
  const handleArtisanPublish = (newCraft) => {
    const confidence = newCraft.confidenceScore || 95;
    if (confidence >= 90) {
      setProducts((prev) => [newCraft, ...prev]);
      showToast(`"${newCraft.title}" is now LIVE on the ONDC Network.`);
    } else {
      showToast(`Confidence ${confidence}%. Sent to Field Ambassador for physical inspection.`);
    }
    setArtisanTab('dashboard');
  };

  // Advance Order Status
  const handleAdvanceOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const next =
            ord.status === 'CONFIRMED' ? 'PROCESSING'
            : ord.status === 'PROCESSING' ? 'READY_TO_SHIP'
            : ord.status === 'READY_TO_SHIP' ? 'SHIPPED'
            : 'DELIVERED';
          return { ...ord, status: next };
        }
        return ord;
      })
    );
    showToast('Fulfillment status updated.');
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Render Role-Specific Content
  const renderContent = () => {
    // 1. ARTISAN / ARTISTE PORTAL
    if (role === 'artisan') {
      switch (artisanTab) {
        case 'dashboard':
          return (
            <ArtisanDashboardScreen
              user={JUNGLE_DATA.currentUser || JUNGLE_DATA.artisan}
              orders={orders}
              products={products}
              onNavigate={(screen) => {
                if (screen === 'artisan_sell' || screen === 'sell') setArtisanTab('sell');
                else if (screen === 'artisan_orders' || screen === 'orders') setArtisanTab('orders');
                else if (screen === 'artisan_amount' || screen === 'amount') setArtisanTab('amount');
                else if (screen === 'artisan_guild' || screen === 'guild') setArtisanTab('guild');
              }}
            />
          );
        case 'sell':
          return (
            <ArtisanSellingWorkflowScreen
              onFinish={handleArtisanPublish}
              onCancel={() => setArtisanTab('dashboard')}
            />
          );
        case 'orders':
          return (
            <ArtisanOrdersScreen
              orders={orders}
              onAdvanceOrder={handleAdvanceOrder}
            />
          );
        case 'amount':
          return (
            <ArtisanAmountScreen
              user={JUNGLE_DATA.currentUser || JUNGLE_DATA.artisan}
              orders={orders}
              onWithdraw={() => {
                showToast('Payout transfer of ₹18,600 initiated to Bank of Baroda.');
              }}
            />
          );
        case 'guild':
          return (
            <ArtisanGuildScreen
              user={JUNGLE_DATA.currentUser || JUNGLE_DATA.artisan}
            />
          );
        default:
          return null;
      }
    }

    // 2. BUYER PORTAL
    if (role === 'buyer') {
      switch (buyerTab) {
        case 'home':
          return (
            <BuyerHomeScreen
              products={products}
              categories={JUNGLE_DATA.categories}
              onSelectProduct={(p) => {
                setSelectedProduct(p);
                setBuyerTab('detail');
              }}
              onAddToCart={handleAddToCart}
              onNavigate={(tab) => {
                if (tab === 'categories') setBuyerTab('categories');
                else if (tab === 'bulk' || tab === 'bulk_buying') setBuyerTab('bulk');
                else if (tab === 'orders' || tab === 'buyer_orders') setBuyerTab('orders');
                else if (tab === 'profile' || tab === 'buyer_profile') setBuyerTab('profile');
                else setBuyerTab('home');
              }}
              onOpenVoiceSearch={() => showToast('Voice Search Active: Speak your craft query')}
              onNavigateCategories={() => setBuyerTab('categories')}
              onOpenBulk={() => setBuyerTab('bulk')}
            />
          );
        case 'categories':
          return (
            <BuyerCategoriesScreen
              categories={JUNGLE_DATA.categories}
              onNavigateHome={() => setBuyerTab('home')}
            />
          );
        case 'bulk':
          return (
            <BulkBuyingScreen
              bulkRequests={JUNGLE_DATA.bulkRequests}
              onOpenRequestModal={() => {
                showToast('Custom wholesale inquiry sent to Bastar Guild.');
              }}
            />
          );
        case 'detail':
          return (
            <ProductDetailScreen
              product={selectedProduct || products[0]}
              onBack={() => setBuyerTab('home')}
              onAddToCart={(p) => {
                handleAddToCart(p);
                setBuyerTab('home');
              }}
              onBuyNow={(p) => {
                setCart([{ product: p, quantity: 1 }]);
                setBuyerTab('checkout');
              }}
            />
          );
        case 'checkout':
          return (
            <CheckoutScreen
              cart={cart}
              onPlaceOrder={handlePlaceOrder}
              onCancel={() => setBuyerTab('home')}
            />
          );
        case 'order_success':
          return (
            <OrderSuccessScreen
              order={lastPlacedOrder || orders[0]}
              onTrack={() => setBuyerTab('orders')}
              onContinueShopping={() => setBuyerTab('home')}
            />
          );
        case 'orders':
          return <BuyerOrdersScreen orders={orders} />;
        case 'profile':
          return (
            <BuyerProfileScreen
              onNavigateOrders={() => setBuyerTab('orders')}
              onNavigateBulk={() => setBuyerTab('bulk')}
            />
          );
        default:
          return null;
      }
    }

    // 3. FIELD AMBASSADOR PORTAL
    if (role === 'ambassador') {
      switch (ambassadorTab) {
        case 'queue':
          return (
            <AmbassadorDashboardScreen
              onNavigate={(screen) => {
                if (screen === 'verify' || screen === 'ambassador_verification') setAmbassadorTab('verify');
                else if (screen === 'network' || screen === 'ambassador_network') setAmbassadorTab('network');
                else if (screen === 'reports' || screen === 'ambassador_reports') setAmbassadorTab('reports');
                else setAmbassadorTab('queue');
              }}
              onVerifyItem={(item) => {
                setVerifyingItem(item);
                setAmbassadorTab('verify');
              }}
            />
          );
        case 'verify':
          return (
            <AmbassadorVerificationScreen
              item={verifyingItem}
              onNavigate={(screen) => {
                if (screen === 'network' || screen === 'ambassador_network') setAmbassadorTab('network');
                else if (screen === 'reports' || screen === 'ambassador_reports') setAmbassadorTab('reports');
                else setAmbassadorTab('queue');
              }}
              onComplete={(itemId) => {
                showToast('Craft physically verified and published on ONDC Ledger.');
                setAmbassadorTab('queue');
              }}
            />
          );
        case 'network':
          return (
            <AmbassadorNetworkScreen
              ambassador={JUNGLE_DATA.ambassador}
            />
          );
        case 'reports':
          return (
            <AmbassadorReportsScreen
              ambassador={JUNGLE_DATA.ambassador}
            />
          );
        default:
          return null;
      }
    }

    return null;
  };

  return (
    <SafeAreaProvider>
      <View style={styles.webViewport}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primaryDark} />

          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <MaterialIcons name="forest" size={20} color="#E8A246" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.brandTitle}>Jungle Market</Text>
                <Text style={styles.brandSub}>ONDC CRAFT NETWORK</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Cart Button (Buyer) */}
              {role === 'buyer' && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setIsCartModalOpen(true)}
                >
                  <MaterialIcons name="shopping-bag" size={20} color="#fff" />
                  {cartCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Portal Persona Switcher Pill (3 Portals) */}
              <TouchableOpacity
                style={styles.rolePill}
                onPress={() => setIsRoleModalOpen(true)}
              >
                <MaterialIcons
                  name={
                    role === 'artisan' ? 'brush'
                    : role === 'buyer' ? 'shopping-cart'
                    : 'verified'
                  }
                  size={14}
                  color="#E8A246"
                />
                <Text style={styles.rolePillText}>
                  {role === 'artisan' ? 'Artisan'
                  : role === 'buyer' ? 'Buyer'
                  : 'Ambassador'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast Alert */}
          {toastMessage && (
            <View style={styles.toast}>
              <MaterialIcons name="check-circle" size={16} color="#E8A246" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          )}

          {/* Main Content Body */}
          <View style={styles.mainContent}>{renderContent()}</View>

          {/* Bottom Tab Bar (Role specific) */}
          <View style={styles.tabBar}>
            {role === 'artisan' && (
              <>
                <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('dashboard')}>
                  <MaterialIcons name="dashboard" size={20} color={artisanTab === 'dashboard' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, artisanTab === 'dashboard' && styles.tabLabelActive]}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('orders')}>
                  <MaterialIcons name="local-shipping" size={20} color={artisanTab === 'orders' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, artisanTab === 'orders' && styles.tabLabelActive]}>Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('sell')}>
                  <View style={styles.sellBtn}>
                    <MaterialIcons name="add" size={24} color="#fff" />
                  </View>
                  <Text style={[styles.tabLabel, artisanTab === 'sell' && styles.tabLabelActive]}>Sell Craft</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('amount')}>
                  <MaterialIcons name="account-balance-wallet" size={20} color={artisanTab === 'amount' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, artisanTab === 'amount' && styles.tabLabelActive]}>Wallet</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('guild')}>
                  <MaterialIcons name="qr-code-2" size={20} color={artisanTab === 'guild' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, artisanTab === 'guild' && styles.tabLabelActive]}>Network QR</Text>
                </TouchableOpacity>
              </>
            )}

            {role === 'buyer' && (
              <>
                <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('home')}>
                  <MaterialIcons name="home" size={20} color={buyerTab === 'home' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, buyerTab === 'home' && styles.tabLabelActive]}>Explore</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('categories')}>
                  <MaterialIcons name="category" size={20} color={buyerTab === 'categories' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, buyerTab === 'categories' && styles.tabLabelActive]}>Categories</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setIsCartModalOpen(true)}>
                  <View style={styles.sellBtn}>
                    <MaterialIcons name="shopping-bag" size={20} color="#fff" />
                  </View>
                  <Text style={[styles.tabLabel, { color: THEME.colors.primary, fontWeight: '700' }]}>Basket ({cartCount})</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('orders')}>
                  <MaterialIcons name="receipt-long" size={20} color={buyerTab === 'orders' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, buyerTab === 'orders' && styles.tabLabelActive]}>My Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('bulk')}>
                  <MaterialIcons name="business" size={20} color={buyerTab === 'bulk' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, buyerTab === 'bulk' && styles.tabLabelActive]}>B2B Bulk</Text>
                </TouchableOpacity>
              </>
            )}

            {role === 'ambassador' && (
              <>
                <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('queue')}>
                  <MaterialIcons name="checklist" size={20} color={ambassadorTab === 'queue' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, ambassadorTab === 'queue' && styles.tabLabelActive]}>AI Queue</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('network')}>
                  <MaterialIcons name="groups" size={20} color={ambassadorTab === 'network' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, ambassadorTab === 'network' && styles.tabLabelActive]}>Artisans</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('reports')}>
                  <MaterialIcons name="insights" size={20} color={ambassadorTab === 'reports' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.tabLabel, ambassadorTab === 'reports' && styles.tabLabelActive]}>Analytics</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Role Switcher Modal (Strictly 3 Portals) */}
          <Modal visible={isRoleModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalTitle}>Switch Experience Portal</Text>
                  <TouchableOpacity onPress={() => setIsRoleModalOpen(false)}>
                    <MaterialIcons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSub}>Select a persona portal to test all end-to-end flows</Text>

                {/* 1. Artisan Portal */}
                <TouchableOpacity
                  style={[styles.roleOption, role === 'artisan' && styles.roleOptionActive]}
                  onPress={() => { setRole('artisan'); setIsRoleModalOpen(false); }}
                >
                  <View style={[styles.roleIconBox, role === 'artisan' && styles.roleIconBoxActive]}>
                    <MaterialIcons name="brush" size={22} color={role === 'artisan' ? '#FFFFFF' : THEME.colors.primary} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.roleOptionName}>🎨 Artiste / Artisan Portal</Text>
                    <Text style={styles.roleOptionDesc}>Voice AI craft listing, fair price calculator, order fulfillment & direct bank wallet</Text>
                  </View>
                  {role === 'artisan' && (
                    <MaterialIcons name="check-circle" size={20} color={THEME.colors.primary} />
                  )}
                </TouchableOpacity>

                {/* 2. Buyer Portal */}
                <TouchableOpacity
                  style={[styles.roleOption, role === 'buyer' && styles.roleOptionActive]}
                  onPress={() => { setRole('buyer'); setIsRoleModalOpen(false); }}
                >
                  <View style={[styles.roleIconBox, role === 'buyer' && styles.roleIconBoxActive]}>
                    <MaterialIcons name="shopping-bag" size={22} color={role === 'buyer' ? '#FFFFFF' : '#C87A28'} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.roleOptionName}>🛍️ Buyer Portal</Text>
                    <Text style={styles.roleOptionDesc}>Browse authentic GI crafts, listen to audio folklore, direct ONDC express checkout</Text>
                  </View>
                  {role === 'buyer' && (
                    <MaterialIcons name="check-circle" size={20} color={THEME.colors.primary} />
                  )}
                </TouchableOpacity>

                {/* 3. Field Ambassador Portal */}
                <TouchableOpacity
                  style={[styles.roleOption, role === 'ambassador' && styles.roleOptionActive]}
                  onPress={() => { setRole('ambassador'); setIsRoleModalOpen(false); }}
                >
                  <View style={[styles.roleIconBox, role === 'ambassador' && styles.roleIconBoxActive]}>
                    <MaterialIcons name="verified" size={22} color={role === 'ambassador' ? '#FFFFFF' : '#2563EB'} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.roleOptionName}>🛡️ Field Ambassador Portal</Text>
                    <Text style={styles.roleOptionDesc}>AI verification queue, audio field inspections & ONDC ledger stamping</Text>
                  </View>
                  {role === 'ambassador' && (
                    <MaterialIcons name="check-circle" size={20} color={THEME.colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Cart Drawer Modal */}
          <Modal visible={isCartModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalTitle}>Your Basket ({cartCount})</Text>
                  <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                    <MaterialIcons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {cart.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <MaterialIcons name="shopping-bag" size={40} color={THEME.colors.textMuted} />
                    <Text style={styles.emptyText}>Your basket is currently empty.</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 240, marginVertical: 10 }}>
                    {cart.map((item, idx) => (
                      <View key={item.product?.id ? `${item.product.id}-${idx}` : `cart-item-${idx}`} style={styles.cartRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cartTitle}>{item.product.title}</Text>
                          <Text style={styles.cartPrice}>
                            ₹{item.product.price} × {item.quantity} = ₹{item.product.price * item.quantity}
                          </Text>
                        </View>
                        <View style={styles.qtyRow}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateCartQty(item.product.id, -1)}>
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateCartQty(item.product.id, 1)}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {cart.length > 0 && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => { setIsCartModalOpen(false); setBuyerTab('checkout'); }}
                  >
                    <Text style={styles.primaryBtnText}>Proceed to ONDC Direct Checkout →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webViewport: {
    flex: 1,
    backgroundColor: '#121714',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : '100%',
    backgroundColor: THEME.colors.primaryDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(200,122,40,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200,122,40,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: THEME.fonts.display,
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D5DFD1',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#C87A28',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    gap: 6,
  },
  rolePillText: {
    fontFamily: THEME.fonts.display,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Toast
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A3D2E',
    borderWidth: 1,
    borderColor: '#E8A246',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },

  // Main Content
  mainContent: { flex: 1, backgroundColor: THEME.colors.surfaceWarm },

  // Bottom Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: { alignItems: 'center', flex: 1 },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  sellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    shadowColor: '#0A3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: {
    fontFamily: THEME.fonts.display,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },

  // Role Switcher Cards
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  roleOptionActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#F3F8F4',
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: {
    backgroundColor: THEME.colors.primary,
  },
  roleOptionName: {
    fontFamily: THEME.fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textDark,
  },
  roleOptionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },

  // Cart Drawer
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  cartTitle: { fontSize: 13, fontWeight: '700', color: THEME.colors.textDark },
  cartPrice: { fontSize: 12, fontWeight: '700', color: '#C87A28', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: THEME.colors.textDark },
  qtyText: { fontSize: 13, fontWeight: '700', color: THEME.colors.textDark },
  emptyText: { fontSize: 13, fontWeight: '500', color: THEME.colors.textMuted, marginTop: 8 },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#0A3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: THEME.fonts.display,
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
