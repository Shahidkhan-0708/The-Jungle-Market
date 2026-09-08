// Jungle Market React Native - Buyer Persona Screens
// Pure React Native components with ASD-STE100 Simple English and Watermelon UI structural adaptations

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { THEME } from "../theme/theme";
import { speakStory, stopStorySpeech } from "../utils/media";

// ----------------------------------------------------
// 1. BUYER HOME SCREEN
// ----------------------------------------------------
export function BuyerHomeScreen({
  categories,
  products,
  onSelectProduct,
  onNavigate,
  onAddToCart,
  onOpenBulk,
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Direct Tribal Sourcing</Text>
        </View>
        <Text style={styles.heroHeadline}>
          Handmade crafts from the heart of Bastar.
        </Text>
        <Text style={styles.heroDescription}>
          Every purchase transfers 89% directly into the artisan bank account through ONDC network.
        </Text>
        <View style={styles.heroButtonsRow}>
          <TouchableOpacity
            style={styles.heroExploreBtn}
            onPress={() => (typeof onNavigate === "function" ? onNavigate("categories") : null)}
          >
            <Text style={styles.heroExploreBtnText}>Explore Crafts →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroBulkBtn}
            onPress={() => (typeof onOpenBulk === "function" ? onOpenBulk() : null)}
          >
            <Text style={styles.heroBulkBtnText}>Bulk Inquiries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Horizontal Carousel */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeadline}>Craft Categories</Text>
        <TouchableOpacity onPress={() => (typeof onNavigate === "function" ? onNavigate("categories") : null)}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        {(categories || []).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.categoryCard}
            onPress={() => (typeof onNavigate === "function" ? onNavigate("categories") : null)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: c.image }} style={styles.categoryImage} />
            <Text style={styles.categoryName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.categoryCount}>{c.itemCount} items</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Masterpieces List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeadline}>Featured Masterpieces</Text>
        <Text style={styles.sectionSubtag}>GI Certified</Text>
      </View>

      {products.map((product) => (
        <View key={product.id} style={styles.productCard}>
          <TouchableOpacity
            style={styles.productRow}
            onPress={() => onSelectProduct(product)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.productCategory}>{product.category}</Text>
                <Text style={styles.productRating}>★ {product.rating}</Text>
              </View>
              <Text style={styles.productTitle} numberOfLines={1}>
                {product.title}
              </Text>
              <Text style={styles.artisanVillageText} numberOfLines={1}>
                {product.artisanName} • {product.artisanVillage}
              </Text>
              <View style={styles.rowBetween}>
                <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
                <Text style={styles.payoutShareText}>₹{product.payoutArtisan} to Artisan</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.productCardActions}>
            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={() => onAddToCart(product.id)}
            >
              <Text style={styles.addToCartBtnText}>Add to Basket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.storyLoreBtn}
              onPress={() => onSelectProduct(product)}
            >
              <Text style={styles.storyLoreBtnText}>Story Lore</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 2. BUYER CATEGORIES SCREEN
// ----------------------------------------------------
export function BuyerCategoriesScreen({ categories, onNavigateHome }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Craft Categories</Text>
        <Text style={styles.screenSubtitle}>Explore traditional heritage crafts</Text>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.categoryGridCard}
            onPress={onNavigateHome}
            activeOpacity={0.85}
          >
            <Image source={{ uri: c.image }} style={styles.categoryGridImage} />
            <Text style={styles.categoryGridName}>{c.name}</Text>
            <Text style={styles.categoryGridDesc} numberOfLines={2}>
              {c.description}
            </Text>
            <Text style={styles.categoryGridCount}>{c.itemCount} Crafts →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ----------------------------------------------------
// 3. PRODUCT DETAIL SCREEN
// ----------------------------------------------------
export function ProductDetailScreen({
  product,
  onAddToCart,
  onBack,
}) {
  // Real story playback: expo-speech reads the voiceLore transcript aloud
  // in the artisan's mother tongue. Visible stop state on the pill.
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const toggleStory = () => {
    if (isPlayingAudio) {
      stopStorySpeech();
      setIsPlayingAudio(false);
      return;
    }
    const started = speakStory(product.voiceLore, {
      onDone: () => setIsPlayingAudio(false),
      onStopped: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
    setIsPlayingAudio(started);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Top Image Hero */}
      <View style={styles.detailHeroBox}>
        <Image source={{ uri: product.image }} style={styles.detailHeroImage} />
        <TouchableOpacity style={styles.backButtonCircle} onPress={onBack}>
          <Text style={{ color: "#ffffff", fontWeight: "bold" }}>←</Text>
        </TouchableOpacity>
        <View style={styles.giBadgeFloat}>
          <Text style={styles.giBadgeFloatText}>GI Certified Bastar Craft</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={styles.productCategory}>{product.category}</Text>
        <Text style={styles.detailTitle}>{product.title}</Text>
        <View style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text style={styles.detailPrice}>₹{product.price.toLocaleString()}</Text>
          <Text style={styles.metaLabel}>{product.stockQuantity} in stock</Text>
        </View>

        {/* Transparent Payout Meter */}
        <View style={styles.payoutMeterCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.payoutMeterTitle}>Transparent Artisan Payout</Text>
            <Text style={styles.payoutMeterShare}>89.2% Direct Share</Text>
          </View>
          <View style={styles.payoutTrack}>
            <View style={[styles.payoutFill, { width: "89.2%" }]} />
          </View>
          <View style={[styles.rowBetween, { marginTop: 4 }]}>
            <Text style={styles.payoutBreakdownText}>₹{product.payoutArtisan} to Artisan</Text>
            <Text style={styles.payoutBreakdownText}>₹{product.payoutLogistics} Logistics</Text>
            <Text style={styles.payoutBreakdownText}>₹{product.payoutNetwork} Network</Text>
          </View>
        </View>

        {/* Audio Story Lore Box */}
        <View style={styles.audioLoreCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.audioLoreHeading}>Listen to Artisan Story</Text>
              <Text style={styles.metaLabel}>{product.artisanName} in mother tongue</Text>
            </View>
            <TouchableOpacity style={styles.audioPlayBtn} onPress={toggleStory}>
              <Text style={styles.audioPlayBtnText}>
                {isPlayingAudio ? "Stop ■" : "Play ▶"}
              </Text>
            </TouchableOpacity>
          </View>
          {isPlayingAudio && (
            <Text style={styles.audioLoreTranscript}>"{product.voiceLore}"</Text>
          )}
        </View>

        <Text style={[styles.sectionHeadline, { marginTop: 16 }]}>Craft Heritage Story</Text>
        <Text style={styles.storyParagraph}>{product.story}</Text>

        <View style={styles.materialsRow}>
          <View style={styles.materialPillBox}>
            <Text style={styles.metaLabel}>Materials</Text>
            <Text style={styles.materialText}>{product.materials}</Text>
          </View>
          <View style={styles.materialPillBox}>
            <Text style={styles.metaLabel}>Dimensions</Text>
            <Text style={styles.materialText}>{product.dimensions}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailAddToCartBtn}
          onPress={() => onAddToCart(product.id)}
        >
          <Text style={styles.detailAddToCartBtnText}>
            Add to Basket (₹{product.price.toLocaleString()})
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ----------------------------------------------------
// 4. CHECKOUT SCREEN
// ----------------------------------------------------
export function CheckoutScreen({ cart, onPlaceOrder, onCancel }) {
  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const artisanShare = Math.round(total * 0.892);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Complete Your Order</Text>
        <Text style={styles.screenSubtitle}>Secure ONDC Payment Protocol</Text>
      </View>

      <View style={styles.checkoutBox}>
        <Text style={styles.checkoutBoxTitle}>Delivery Address</Text>
        <Text style={styles.addressName}>Rahul Verma • +91 98101 23456</Text>
        <Text style={styles.addressLine}>
          Flat 402, Green Meadows, Vasant Kunj, New Delhi 110070
        </Text>
      </View>

      <View style={styles.payoutMeterCard}>
        <Text style={styles.payoutMeterTitle}>Direct Artisan Settlement</Text>
        <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Text style={styles.metaLabel}>Items Total ({cart.length} craft)</Text>
          <Text style={styles.metaValue}>₹{total.toLocaleString()}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text style={styles.metaLabel}>Delivery via Delhivery</Text>
          <Text style={[styles.metaValue, { color: "#1f5d3a" }]}>Free</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: THEME.colors.surfaceContainer }]}>
          <Text style={styles.sectionHeadline}>Total Payment</Text>
          <Text style={styles.detailPrice}>₹{total.toLocaleString()}</Text>
        </View>
        <Text style={styles.settlementNote}>
          ₹{artisanShare.toLocaleString()} transfers directly to the artisan bank account.
        </Text>
      </View>

      <TouchableOpacity style={styles.confirmOrderBtn} onPress={onPlaceOrder}>
        <Text style={styles.confirmOrderBtnText}>
          Pay ₹{total.toLocaleString()} & Confirm Order
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------------------------------------------
// 5. ORDER SUCCESS SCREEN
// ----------------------------------------------------
export function OrderSuccessScreen({ order, onTrack, onContinueShopping }) {
  return (
    <View style={[styles.container, { alignItems: "center", justifyContent: "center", paddingVertical: 40 }]}>
      <View style={styles.successIconCircle}>
        <Text style={{ fontSize: 32 }}>✓</Text>
      </View>
      <Text style={styles.successHeading}>Payment Complete!</Text>
      <Text style={styles.stepDescription}>
        The artisan was notified. Your craft is being packed in a traditional bamboo case.
      </Text>

      <View style={[styles.checkoutBox, { width: "100%", marginVertical: 16 }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.metaValueMono}>{order.id}</Text>
          <Text style={styles.statValueGreen}>₹{order.totalAmount.toLocaleString()}</Text>
        </View>
        <Text style={[styles.orderProductTitle, { marginTop: 6 }]}>{order.productTitle}</Text>
        <Text style={[styles.metaLabel, { marginTop: 4 }]}>
          Tracking: {order.trackingNumber}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
        <TouchableOpacity style={styles.primaryActionBtn} onPress={onTrack}>
          <Text style={styles.primaryActionBtnText}>Track Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryActionBtn} onPress={onContinueShopping}>
          <Text style={styles.secondaryActionBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ----------------------------------------------------
// 6. BUYER ORDERS SCREEN
// ----------------------------------------------------
export function BuyerOrdersScreen({ orders }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Your Orders</Text>
        <Text style={styles.screenSubtitle}>Live ONDC order status</Text>
      </View>

      {orders.map((order) => (
        <View key={order.id} style={styles.orderCardBox}>
          <View style={styles.rowBetween}>
            <Text style={styles.metaValueMono}>{order.id}</Text>
            <Text style={styles.statusPill}>{order.status}</Text>
          </View>

          <View style={styles.orderBodyRow}>
            <Image source={{ uri: order.productImage }} style={styles.orderProductImage} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.orderProductTitle} numberOfLines={1}>
                {order.productTitle}
              </Text>
              <Text style={styles.orderBuyerText}>
                {order.date} • {order.shippingProvider}
              </Text>
              <Text style={styles.orderPayoutText}>₹{order.totalAmount.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.timelineList}>
            {order.timeline.slice(0, 4).map((step, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <Text style={step.done ? styles.timelineDotDone : styles.timelineDotPending}>
                  {step.done ? "●" : "○"}
                </Text>
                <Text style={[styles.metaLabel, step.done && { color: THEME.colors.onSurface, fontWeight: "600" }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 7. BULK BUYING SCREEN
// ----------------------------------------------------
export function BulkBuyingScreen({ bulkRequests, onOpenRequestModal }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.screenTitle}>Bulk B2B Sourcing Hub</Text>
          <Text style={styles.screenSubtitle}>Wholesale artisan procurement via ONDC</Text>
        </View>
        <TouchableOpacity style={styles.requestQuoteBtn} onPress={onOpenRequestModal}>
          <Text style={styles.requestQuoteBtnText}>+ Request Quote</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bulkPropsRow}>
        <View style={styles.bulkPropBox}>
          <Text style={styles.bulkPropTitle}>GI Certified</Text>
        </View>
        <View style={styles.bulkPropBox}>
          <Text style={styles.bulkPropTitle}>Direct Transit</Text>
        </View>
        <View style={styles.bulkPropBox}>
          <Text style={styles.bulkPropTitle}>GST Invoices</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeadline, { marginTop: 18, marginBottom: 10 }]}>
        Active Sourcing RFQs ({bulkRequests.length})
      </Text>

      {bulkRequests.map((req) => (
        <View key={req.id} style={styles.orderCardBox}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderProductTitle}>{req.buyerOrg}</Text>
            <Text style={styles.statusPill}>{req.status}</Text>
          </View>
          <Text style={[styles.metaLabel, { marginTop: 4 }]}>
            Category: {req.productCategory} • Quantity: {req.targetQuantity} units
          </Text>
          <Text style={styles.metaLabel}>
            Target Budget: ₹{req.targetBudgetPerUnit}/unit • Need by: {req.requiredDeliveryDate}
          </Text>
          <Text style={styles.bulkRequirementText}>"{req.customRequirement}"</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 8. BUYER PROFILE SCREEN
// ----------------------------------------------------
export function BuyerProfileScreen({ onNavigateOrders, onNavigateBulk }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatarCircle}>
          <Text style={styles.profileAvatarInitials}>RV</Text>
        </View>
        <Text style={styles.guildName}>Rahul Verma</Text>
        <Text style={styles.guildVillage}>Verified Buyer • New Delhi</Text>
      </View>

      <TouchableOpacity style={styles.menuRowBtn} onPress={onNavigateOrders}>
        <Text style={styles.menuRowText}>📦 Order History</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuRowBtn} onPress={onNavigateBulk}>
        <Text style={styles.menuRowText}>📑 My Bulk Requests</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------------------------------------------
// STYLES
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: THEME.colors.background,
  },
  heroBanner: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: 18,
    marginBottom: 16,
    ...THEME.shadows.md,
  },
  heroBadge: {
    backgroundColor: THEME.colors.primaryContainer,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  heroBadgeText: {
    color: THEME.colors.onPrimaryContainer,
    fontSize: 11,
    fontWeight: "600",
  },
  heroHeadline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    lineHeight: 24,
  },
  heroDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginVertical: 8,
    lineHeight: 18,
  },
  heroButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  heroExploreBtn: {
    backgroundColor: THEME.colors.secondary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  heroExploreBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  heroBulkBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    height: 42,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  heroBulkBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeadline: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  viewAllText: {
    fontSize: 12,
    color: THEME.colors.secondary,
    fontWeight: "600",
  },
  sectionSubtag: {
    fontSize: 11,
    color: THEME.colors.secondary,
    fontWeight: "500",
  },
  categoryCard: {
    width: 120,
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    ...THEME.shadows.sm,
  },
  categoryImage: {
    width: "100%",
    height: 70,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  categoryCount: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 12,
    ...THEME.shadows.sm,
  },
  productRow: {
    flexDirection: "row",
  },
  productImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productCategory: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.colors.secondary,
    textTransform: "uppercase",
  },
  productRating: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.warning,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 2,
  },
  artisanVillageText: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 4,
  },
  payoutShareText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1f5d3a",
  },
  productCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceContainer,
  },
  addToCartBtn: {
    flex: 1,
    height: 42,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  storyLoreBtn: {
    height: 42,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  storyLoreBtnText: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryGridCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  categoryGridImage: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryGridName: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  categoryGridDesc: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
    marginVertical: 4,
    lineHeight: 14,
  },
  categoryGridCount: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.secondary,
  },
  detailHeroBox: {
    width: "100%",
    height: 260,
    position: "relative",
  },
  detailHeroImage: {
    width: "100%",
    height: "100%",
  },
  backButtonCircle: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  giBadgeFloat: {
    position: "absolute",
    bottom: 12,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  giBadgeFloatText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 4,
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  metaLabel: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
  },
  payoutMeterCard: {
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  payoutMeterTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  payoutMeterShare: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.secondary,
  },
  payoutTrack: {
    height: 8,
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: 9999,
    overflow: "hidden",
    marginVertical: 6,
  },
  payoutFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
  },
  payoutBreakdownText: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
  },
  audioLoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 12,
  },
  audioLoreHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  audioPlayBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  audioPlayBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  audioLoreTranscript: {
    fontSize: 11,
    color: THEME.colors.onSurface,
    fontStyle: "italic",
    backgroundColor: THEME.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  storyParagraph: {
    fontSize: 12,
    color: THEME.colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 4,
  },
  materialsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  materialPillBox: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 8,
  },
  materialText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.onSurface,
    marginTop: 2,
  },
  detailAddToCartBtn: {
    backgroundColor: THEME.colors.primary,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  detailAddToCartBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  screenHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceContainer,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  screenSubtitle: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  checkoutBox: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 12,
  },
  checkoutBoxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  addressName: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.onSurface,
    marginTop: 4,
  },
  addressLine: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  settlementNote: {
    fontSize: 11,
    color: "#1f5d3a",
    fontWeight: "500",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceContainer,
  },
  confirmOrderBtn: {
    backgroundColor: THEME.colors.secondary,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  confirmOrderBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e8f8e7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successHeading: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  stepDescription: {
    fontSize: 12,
    color: THEME.colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  metaValueMono: {
    fontSize: 12,
    fontFamily: "monospace",
    color: THEME.colors.primary,
    fontWeight: "600",
  },
  statValueGreen: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f5d3a",
  },
  orderProductTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  primaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.surfaceContainer,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryActionBtnText: {
    color: THEME.colors.onSurface,
    fontSize: 12,
    fontWeight: "600",
  },
  orderCardBox: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 12,
  },
  statusPill: {
    backgroundColor: THEME.colors.secondaryContainer,
    color: THEME.colors.onSecondaryContainer,
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  orderProductImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  orderBuyerText: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
  },
  orderPayoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 2,
  },
  timelineList: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceContainer,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  timelineDotDone: {
    color: THEME.colors.primary,
    marginRight: 6,
    fontSize: 12,
  },
  timelineDotPending: {
    color: THEME.colors.outlineVariant,
    marginRight: 6,
    fontSize: 12,
  },
  requestQuoteBtn: {
    backgroundColor: THEME.colors.secondary,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  requestQuoteBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  bulkPropsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  bulkPropBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  bulkPropTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  bulkRequirementText: {
    fontSize: 11,
    color: THEME.colors.onSurface,
    fontStyle: "italic",
    backgroundColor: THEME.colors.surfaceContainerLow,
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 14,
  },
  profileAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  profileAvatarInitials: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  guildName: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  guildVillage: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  menuRowBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 8,
  },
  menuRowText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  menuRowArrow: {
    fontSize: 16,
    color: THEME.colors.onSurfaceVariant,
  },
});
