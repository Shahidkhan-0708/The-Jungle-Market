// Jungle Market — React Native Root Application
// Architecture: Buyer → Marketplace → Order
//               Artisan → Voice + Photo → OpenCV → Confidence → Listed or Ambassador Review
//               Ambassador → Review low-confidence items → Approve/Reject → Listed
//
// Simple English rules: short sentences, active voice, no contractions.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { THEME } from './theme/theme';
import { JUNGLE_DATA } from './data/jungleData';

// Artisan Screens (5 Stitch Frames)
import {
  ArtisanDashboardScreen,
  ArtisanSellingWorkflowScreen,
  ArtisanOrdersScreen,
  ArtisanAmountScreen,
  ArtisanGuildScreen
} from './screens/ArtisanScreens';

// Buyer Screens (5 Stitch Frames)
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

// Ambassador Screens (4 Stitch Frames)
import {
  AmbassadorDashboardScreen,
  AmbassadorVerificationScreen,
  AmbassadorNetworkScreen,
  AmbassadorReportsScreen
} from './screens/AmbassadorScreens';

export default function App() {
  // ── Role state ──
  const [role, setRole] = useState('artisan');

  // ── Per-role navigation ──
  const [artisanTab, setArtisanTab] = useState('dashboard');
  const [buyerTab, setBuyerTab] = useState('home');
  const [ambassadorTab, setAmbassadorTab] = useState('queue');

  // ── Shared data state ──
  const [products, setProducts] = useState(JUNGLE_DATA.products || []);
  const [orders, setOrders] = useState(JUNGLE_DATA.activeOrders || []);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [verifyingItem, setVerifyingItem] = useState(null);

  // ── Modals ──
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Cart helpers ──
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

  // ── Place order ──
  const handlePlaceOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    setIsCartModalOpen(false);
    setBuyerTab('order_success');
    showToast(`Order ${newOrder.id} placed on ONDC.`);
  };

  // ── Artisan publishes a craft ──
  // Confidence >= 90 → listed directly.
  // Confidence < 90  → routed to Ambassador queue.
  const handleArtisanPublish = (newCraft) => {
    const confidence = newCraft.confidenceScore || 95;
    if (confidence >= 90) {
      setProducts((prev) => [newCraft, ...prev]);
      showToast(`"${newCraft.title}" is live on the ONDC Network.`);
    } else {
      showToast(`Confidence ${confidence}%. Sent to Ambassador for verification.`);
    }
    setArtisanTab('dashboard');
  };

  // ── Advance order status (artisan fulfillment) ──
  const handleAdvanceOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const next =
            ord.status === 'CONFIRMED' ? 'PACKED'
            : ord.status === 'PACKED' ? 'OUT_FOR_DELIVERY'
            : 'DELIVERED';
          return { ...ord, status: next };
        }
        return ord;
      })
    );
    showToast('Order status updated.');
  };

  // ── Total cart count ──
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // ── Render role-specific screen ──
  // ── Render role-specific screen ──
  const renderContent = () => {
    // ───────────── ARTISAN (5 Stitch Frames) ─────────────
    if (role === 'artisan') {
      switch (artisanTab) {
        case 'dashboard':
          return (
            <ArtisanDashboardScreen
              user={JUNGLE_DATA.currentUser}
              orders={orders}
              products={products}
              onNavigate={(screen) => {
                if (screen === 'artisan_sell' || screen === 'sell') setArtisanTab('sell');
                else if (screen === 'artisan_orders' || screen === 'orders') setArtisanTab('orders');
                else if (screen === 'artisan_amount' || screen === 'amount') setArtisanTab('amount');
                else if (screen === 'artisan_guild' || screen === 'guild') setArtisanTab('guild');
              }}
              onNavigateSell={() => setArtisanTab('sell')}
              onNavigateOrders={() => setArtisanTab('orders')}
              onNavigateAmount={() => setArtisanTab('amount')}
              onNavigateGuild={() => setArtisanTab('guild')}
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
              user={JUNGLE_DATA.currentUser}
              orders={orders}
              onWithdraw={() => {
                showToast('Payout transfer of ₹18,600 initiated to Bank of Baroda.');
              }}
            />
          );
        case 'guild':
          return (
            <ArtisanGuildScreen
              user={JUNGLE_DATA.currentUser}
            />
          );
        default:
          return null;
      }
    }

    // ───────────── BUYER (5 Stitch Frames) ─────────────
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
              onOpenVoiceSearch={() => {}}
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
                showToast('Custom sourcing inquiry sent to Bastar Guild.');
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

    // ───────────── AMBASSADOR (4 Stitch Frames) ─────────────
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
                showToast('Craft verified and published on ONDC.');
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primaryDark} />

      {/* ── Header Bar ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="forest" size={20} color="#fff" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.brandTitle}>Jungle Market</Text>
            <Text style={styles.brandSub}>ONDC Craft Network</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Cart button — buyer only */}
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

          {/* Persona switcher pill */}
          <TouchableOpacity
            style={styles.rolePill}
            onPress={() => setIsRoleModalOpen(true)}
          >
            <MaterialIcons
              name={role === 'artisan' ? 'brush' : role === 'buyer' ? 'person' : 'shield'}
              size={14}
              color="#fff"
            />
            <Text style={styles.rolePillText}>
              {role === 'artisan' ? 'Artisan' : role === 'buyer' ? 'Buyer' : 'Ambassador'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Toast ── */}
      {toastMessage && (
        <View style={styles.toast}>
          <MaterialIcons name="check-circle" size={16} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* ── Main Content ── */}
      <View style={styles.mainContent}>{renderContent()}</View>

      {/* ── Bottom Tab Bar (Stitch Frames Exact Match) ── */}
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
                <MaterialIcons name="add" size={22} color="#fff" />
              </View>
              <Text style={[styles.tabLabel, artisanTab === 'sell' && styles.tabLabelActive]}>Sell Craft</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setArtisanTab('amount')}>
              <MaterialIcons name="account-balance-wallet" size={20} color={artisanTab === 'amount' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, artisanTab === 'amount' && styles.tabLabelActive]}>Amount</Text>
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
              <Text style={[styles.tabLabel, buyerTab === 'home' && styles.tabLabelActive]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('categories')}>
              <MaterialIcons name="category" size={20} color={buyerTab === 'categories' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, buyerTab === 'categories' && styles.tabLabelActive]}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('bulk')}>
              <MaterialIcons name="inventory-2" size={20} color={buyerTab === 'bulk' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, buyerTab === 'bulk' && styles.tabLabelActive]}>Bulk Sourcing</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('orders')}>
              <MaterialIcons name="receipt-long" size={20} color={buyerTab === 'orders' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, buyerTab === 'orders' && styles.tabLabelActive]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setBuyerTab('profile')}>
              <MaterialIcons name="person" size={20} color={buyerTab === 'profile' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, buyerTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'ambassador' && (
          <>
            <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('queue')}>
              <MaterialIcons name="dashboard" size={20} color={ambassadorTab === 'queue' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, ambassadorTab === 'queue' && styles.tabLabelActive]}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('verify')}>
              <MaterialIcons name="fact-check" size={20} color={ambassadorTab === 'verify' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, ambassadorTab === 'verify' && styles.tabLabelActive]}>Verify Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('network')}>
              <MaterialIcons name="group-add" size={20} color={ambassadorTab === 'network' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, ambassadorTab === 'network' && styles.tabLabelActive]}>Network</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tab} onPress={() => setAmbassadorTab('reports')}>
              <MaterialIcons name="bar-chart" size={20} color={ambassadorTab === 'reports' ? THEME.colors.primary : THEME.colors.textMuted} />
              <Text style={[styles.tabLabel, ambassadorTab === 'reports' && styles.tabLabelActive]}>Reports</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ══════════════════════════════════
          ROLE SWITCHER MODAL
          ══════════════════════════════════ */}
      <Modal visible={isRoleModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Your Role</Text>
            <Text style={styles.modalSub}>
              Experience Jungle Market from any of the three community views.
            </Text>

            {[
              { key: 'artisan', icon: 'brush', name: 'Ramesh Baghel (Artisan)', desc: 'List crafts, manage ONDC orders, get direct payouts.' },
              { key: 'buyer', icon: 'shopping-bag', name: 'Ananya Sharma (Buyer)', desc: 'Browse tribal crafts, hear artisan stories, buy direct.' },
              { key: 'ambassador', icon: 'verified-user', name: 'Rajesh Sahu (Ambassador)', desc: 'Inspect low-confidence crafts, approve for ONDC.' }
            ].map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleOption, role === r.key && styles.roleOptionActive]}
                onPress={() => {
                  setRole(r.key);
                  if (r.key === 'artisan') setArtisanTab('dashboard');
                  else if (r.key === 'buyer') setBuyerTab('home');
                  else setAmbassadorTab('queue');
                  setIsRoleModalOpen(false);
                }}
              >
                <MaterialIcons name={r.icon} size={24} color={role === r.key ? THEME.colors.primary : THEME.colors.textMuted} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.roleOptionName}>{r.name}</Text>
                  <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalClose} onPress={() => setIsRoleModalOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════
          CART DRAWER MODAL (buyer only)
          ══════════════════════════════════ */}
      <Modal visible={isCartModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>Your Basket</Text>
              <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <MaterialIcons name="shopping-bag" size={40} color={THEME.colors.textMuted} />
                <Text style={styles.emptyText}>Your basket is empty.</Text>
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
                <Text style={styles.primaryBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ──────────────────────────────────────
// Stylesheet
// ──────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.primaryDark },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: THEME.colors.primaryDark, paddingHorizontal: 16, paddingVertical: 12
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center'
  },
  brandTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  brandSub: { fontSize: 10, fontWeight: '400', color: THEME.colors.primaryLight, letterSpacing: 0.5 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center'
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: THEME.colors.bark, borderRadius: 9, width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center'
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  rolePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: THEME.radius.full, gap: 4
  },
  rolePillText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // Toast
  toast: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.colors.bark, paddingHorizontal: 16, paddingVertical: 10, gap: 8
  },
  toastText: { color: '#fff', fontSize: 12, fontWeight: '500', flex: 1 },

  // Main
  mainContent: { flex: 1, backgroundColor: THEME.colors.surfaceWarm },

  // Bottom tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: THEME.colors.surfaceCard,
    borderTopWidth: 1, borderTopColor: THEME.colors.border,
    paddingVertical: 8, paddingBottom: 16, justifyContent: 'space-around', alignItems: 'center'
  },
  tab: { alignItems: 'center', flex: 1 },
  tabLabel: { fontSize: 10, fontWeight: '400', color: THEME.colors.textMuted, marginTop: 2 },
  tabLabelActive: { color: THEME.colors.primary, fontWeight: '700' },
  sellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: -10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4
  },

  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderTopLeftRadius: THEME.radius.xl, borderTopRightRadius: THEME.radius.xl, padding: 20
  },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: THEME.colors.textDark },
  modalSub: { fontSize: 13, fontWeight: '400', color: THEME.colors.textMuted, marginTop: 4, marginBottom: 16 },
  modalClose: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  modalCloseText: { fontSize: 14, fontWeight: '500', color: THEME.colors.textMuted },

  // Role selector
  roleOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: THEME.radius.md, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: 10
  },
  roleOptionActive: { borderColor: THEME.colors.primary, backgroundColor: THEME.colors.surface },
  roleOptionName: { fontSize: 14, fontWeight: '600', color: THEME.colors.textDark },
  roleOptionDesc: { fontSize: 12, fontWeight: '400', color: THEME.colors.textMuted, marginTop: 2 },

  // Cart drawer
  cartRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: THEME.colors.borderLight
  },
  cartTitle: { fontSize: 13, fontWeight: '500', color: THEME.colors.textDark },
  cartPrice: { fontSize: 12, fontWeight: '400', color: THEME.colors.primary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.colors.surfaceWarm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.colors.border
  },
  qtyBtnText: { fontSize: 14, fontWeight: '500', color: THEME.colors.textDark },
  qtyText: { fontSize: 13, fontWeight: '500', color: THEME.colors.textDark },
  emptyText: { fontSize: 14, fontWeight: '400', color: THEME.colors.textMuted, marginTop: 8 },
  primaryBtn: {
    backgroundColor: THEME.colors.primary, paddingVertical: 14,
    borderRadius: THEME.radius.md, alignItems: 'center', marginTop: 14
  },
  primaryBtnText: { fontSize: 14, fontWeight: '500', color: '#fff' },
});
