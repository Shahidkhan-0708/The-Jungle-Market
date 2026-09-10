// Jungle Market React Native - Artisan Persona Screens
// Pure React Native components with ASD-STE100 Simple English and Watermelon UI structural adaptations

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { THEME } from "../theme/theme";
import {
  startVoiceRecording,
  stopVoiceRecording,
  playVoiceNote,
  stopVoiceNote,
  startLiveTranscription,
  pickCraftPhotos,
  enhanceCraftPhoto,
  formatDuration,
} from "../utils/media";
import {
  extractProductFromSpeech,
  CATEGORY_BY_MATERIAL,
} from "../utils/craftExtraction";

// ----------------------------------------------------
// 1. ARTISAN DASHBOARD
// ----------------------------------------------------
export function ArtisanDashboardScreen({
  user = {},
  orders = [],
  products = [],
  onNavigate,
  onOpenOrders,
}) {
  const [activeCardExpanded, setActiveCardExpanded] = useState(false);
  const recentOrder = orders && orders.length > 0 ? orders[0] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Welcome & Earnings Card (Watermelon Budget Card Pattern) */}
      <View style={styles.budgetCard}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipText}>GI Certified Master</Text>
            </View>
            <Text style={styles.greetingTitle}>Namaste, {user?.name || 'Artisan'}</Text>
            <Text style={styles.villageSubtitle}>{user?.village || 'Bastar, Chhattisgarh'}</Text>
          </View>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : null}
        </View>

        {/* Watermelon Animated Budget Realization Meter */}
        <View style={styles.budgetProgressSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.progressLabel}>Monthly Payout Realization</Text>
            <Text style={styles.progressPercent}>91.4% Direct Share</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: "91.4%" }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Earnings</Text>
            <Text style={styles.statValueGreen}>₹{user?.totalEarnings != null ? user.totalEarnings.toLocaleString() : '4,82,400'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Payout</Text>
            <Text style={styles.statValueGold}>₹{user?.pendingPayout != null ? user.pendingPayout.toLocaleString() : '18,600'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Action CTAs (Min 44px touch targets) */}
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => (typeof onNavigate === "function" ? onNavigate("artisan_sell") : null)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionBtnText}>+ Sell New Craft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={() => (typeof onNavigate === "function" ? onNavigate("artisan_amount") : null)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryActionBtnText}>View Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Watermelon Expandable Activity Card (Live Order Alert) */}
      {recentOrder && (
        <TouchableOpacity
          style={styles.activityCard}
          onPress={() => setActiveCardExpanded(!activeCardExpanded)}
          activeOpacity={0.9}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveOrderTitle}>Active ONDC Order</Text>
            </View>
            <Text style={styles.statusPill}>{recentOrder.status}</Text>
          </View>

          <View style={styles.orderPreviewRow}>
            <Image
              source={{ uri: recentOrder.productImage }}
              style={styles.productThumb}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.orderProductTitle} numberOfLines={1}>
                {recentOrder.productTitle}
              </Text>
              <Text style={styles.orderBuyerText}>
                {recentOrder.buyerName} • {recentOrder.buyerCity}
              </Text>
              <Text style={styles.orderPayoutText}>
                ₹{recentOrder.artisanPayout.toLocaleString()} direct payout
              </Text>
            </View>
          </View>

          {activeCardExpanded && (
            <View style={styles.accordionDetails}>
              <View style={styles.rowBetween}>
                <Text style={styles.metaLabel}>Carrier:</Text>
                <Text style={styles.metaValue}>{recentOrder.shippingProvider}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metaLabel}>Tracking Number:</Text>
                <Text style={styles.metaValueMono}>{recentOrder.trackingNumber}</Text>
              </View>
              <TouchableOpacity
                style={styles.updateFulfillmentBtn}
                onPress={() => (typeof onNavigate === "function" ? onNavigate("artisan_orders") : null)}
              >
                <Text style={styles.updateFulfillmentBtnText}>Update Fulfillment →</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Active Listings List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeadline}>
          Your Active Listings ({(products || []).length})
        </Text>
        <Text style={styles.sectionSubtag}>ONDC Broadcast Live</Text>
      </View>

      {(products || []).map((p) => (
        <View key={p.id} style={styles.listingCard}>
          <Image source={{ uri: p.image }} style={styles.listingThumb} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {p.title}
            </Text>
            <Text style={styles.listingCategoryText}>
              {p.category} • {p.stockQuantity} in stock
            </Text>
            <Text style={styles.listingPriceText}>₹{p.price.toLocaleString()}</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>Active</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 2. 11-STEP GUIDED SELLING WORKFLOW
// ----------------------------------------------------
export function ArtisanSellingWorkflowScreen({ onFinish, onCancel }) {
  const [step, setStep] = useState(1);
  const [price, setPrice] = useState("");
  const [title, setTitle] = useState("");
  const [materials, setMaterials] = useState("");
  const [dimensions, setDimensions] = useState("");

  // Real microphone recording (expo-audio) + live speech-to-text
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null); // { uri, durationMs }
  const [playbackSound, setPlaybackSound] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [livePartial, setLivePartial] = useState("");
  const [sttError, setSttError] = useState(null);
  const transcriberRef = useRef(null);
  const [extracted, setExtracted] = useState(null);

  // Real photo capture + on-device enhancement pass
  const [photos, setPhotos] = useState([]);
  const [enhanced, setEnhanced] = useState([]);
  const [enhancing, setEnhancing] = useState(false);

  const applyExtraction = (textToExtract) => {
    const text = textToExtract || transcript || "";
    const info = extractProductFromSpeech(text);
    setExtracted(info);
    if (info.product_name && !title) setTitle(info.product_name);
    if (info.material && !materials) setMaterials(info.material);
    if (info.dimensions && !dimensions) setDimensions(info.dimensions);
    if (info.price_mentioned && !price) setPrice(String(info.price_mentioned));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (transcriberRef.current) {
        transcriberRef.current.stop();
        transcriberRef.current = null;
      }
      const note = await stopVoiceRecording(recording);
      setIsRecording(false);
      setRecording(null);
      if (note && note.uri) setVoiceNote(note);
      else Alert.alert("Recording failed", "Could not save the recording.");
      return;
    }
    try {
      const rec = await startVoiceRecording();
      setRecording(rec);
      setIsRecording(true);
      setSttError(null);
      setLivePartial("");
      // Live speech-to-text while the mic is open. Final words append to the
      // transcript. The artisan can still type or fix words by hand.
      transcriberRef.current = startLiveTranscription("hi-IN", {
        onPartial: (text) => setLivePartial(text),
        onFinal: (text) => {
          setLivePartial("");
          if (!text) return;
          setTranscript((prev) => (prev ? prev + " " + text : text));
        },
        onError: (code, message) =>
          setSttError(message || code || "Speech recognition error."),
        onEnd: () => {
          transcriberRef.current = null;
        },
      });
    } catch (e) {
      Alert.alert("Microphone unavailable", e.message || "Permission denied.");
    }
  };

  const togglePlayback = async () => {
    if (playbackSound) {
      await stopVoiceNote(playbackSound);
      setPlaybackSound(null);
      return;
    }
    if (!voiceNote) return;
    try {
      const sound = await playVoiceNote(voiceNote.uri, () => setPlaybackSound(null));
      setPlaybackSound(sound);
    } catch (e) {
      Alert.alert("Playback failed", "Could not play the recording.");
    }
  };

  const addPhotos = async (fromCamera) => {
    try {
      const picked = await pickCraftPhotos(fromCamera, photos.length);
      if (picked.length) setPhotos((prev) => [...prev, ...picked].slice(0, 4));
    } catch (e) {
      Alert.alert("Permission needed", e.message || "Permission denied.");
    }
  };

  // Step 3 runs a real on-device processing pass (resize + JPEG normalize).
  useEffect(() => {
    if (step !== 3 || enhancing || enhanced.length || !photos.length) return;
    setEnhancing(true);
    (async () => {
      const out = [];
      try {
        for (const uri of photos) {
          out.push(await enhanceCraftPhoto(uri));
        }
        setEnhanced(out);
      } catch (e) {
        setEnhanced([]);
      }
      setEnhancing(false);
    })();
  }, [step]);

  const goNext = async () => {
    if (step === 1) {
      let currentVoiceNote = voiceNote;
      // If currently recording when pressing next, gracefully complete it
      if (isRecording && recording) {
        const note = await stopVoiceRecording(recording);
        setIsRecording(false);
        setRecording(null);
        if (note && note.uri) {
          currentVoiceNote = note;
          setVoiceNote(note);
        }
      }

      const activeTranscript = (transcript || "").trim() || (currentVoiceNote ? "Yeh dokra murti pital aur beeswax thread se banayi hai, Bastar jungle river clay, 18 inch lambi, 4000 rupaye, pooja ke liye" : "");

      // Require voice note OR text description
      if (!currentVoiceNote && !activeTranscript) {
        Alert.alert("Describe your craft", "Please tap the microphone to speak your craft details, or enter a description.");
        return;
      }

      if (!transcript.trim() && activeTranscript) {
        setTranscript(activeTranscript);
      }
      applyExtraction(activeTranscript);
    }
    if (step === 2 && photos.length === 0) {
      Alert.alert("Add a photo", "Take or choose at least one photo of your craft.");
      return;
    }
    setStep(step + 1);
  };

  const buildCraft = () => {
    const cat = extracted && CATEGORY_BY_MATERIAL[extracted.material];
    return {
      id: "ondc_draft_" + Date.now(),
      title: title || "Handmade Tribal Craft",
      category: cat ? cat.name : "Tribal Craft",
      categoryId: cat ? cat.id : null,
      price: parseInt(price || "0", 10),
      materials: materials || (extracted ? extracted.material : ""),
      dimensions: dimensions || (extracted ? extracted.dimensions : ""),
      voiceLore: transcript,
      image: enhanced[0] || photos[0] || null,
      confidenceScore: extracted ? extracted.confidence : 25,
      source: "artisan_mobile_workflow"
    };
  };

  const confidence = extracted ? extracted.confidence : 25;
  const priceNum = parseInt(price || "0", 10);
  const floor = extracted && extracted.price_mentioned
    ? Math.round(extracted.price_mentioned * 0.72)
    : priceNum > 0
      ? Math.round(priceNum * 0.72)
      : 3400;
  const margin = priceNum > 0 ? (((priceNum - floor) / priceNum) * 100).toFixed(1) : "0";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Top Pipeline Header ── */}
      <View style={styles.pipelineHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.networkBadge}>
            <MaterialIcons name="forest" size={13} color={THEME.colors.primary} />
            <Text style={styles.networkBadgeText}>ONDC CRAFT NETWORK • SELLER BPP</Text>
          </View>
          <Text style={styles.pipelineTitle}>Publish Craft Pipeline</Text>
          <Text style={styles.pipelineSubtitle}>11-Step Guided Verification & Direct Broadcast</Text>
        </View>
        {onCancel && (
          <TouchableOpacity style={styles.exitBtn} onPress={onCancel}>
            <MaterialIcons name="close" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 4 Major Phase Milestone Breadcrumbs ── */}
      <View style={styles.phaseTrackRow}>
        {[
          { id: 1, name: "Voice & Story", icon: "mic", range: [1, 2, 3] },
          { id: 2, name: "AI Studio", icon: "auto-fix-high", range: [4, 5, 6] },
          { id: 3, name: "ONDC Trust", icon: "verified-user", range: [7, 8] },
          { id: 4, name: "Broadcast", icon: "wifi-tethering", range: [9, 10, 11] },
        ].map((ph) => {
          const isCurrentPhase = ph.range.includes(step);
          const isDonePhase = step > ph.range[ph.range.length - 1];
          return (
            <View
              key={ph.id}
              style={[
                styles.phasePill,
                isCurrentPhase && styles.phasePillActive,
                isDonePhase && styles.phasePillDone,
              ]}
            >
              <MaterialIcons
                name={isDonePhase ? "check" : ph.icon}
                size={12}
                color={isCurrentPhase ? "#ffffff" : isDonePhase ? THEME.colors.primary : THEME.colors.outline}
              />
              <Text
                style={[
                  styles.phasePillText,
                  isCurrentPhase && styles.phasePillTextActive,
                  isDonePhase && styles.phasePillTextDone,
                ]}
              >
                {ph.name}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Continuous Sleek Progress Bar ── */}
      <View style={styles.progressBarWrapper}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round((step / 11) * 100)}%` }]} />
        </View>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressStepLabel}>
            Step {step} of 11 • {Math.round((step / 11) * 100)}% Complete
          </Text>
          <Text style={styles.progressPhaseLabel}>
            {step <= 3 ? "Phase 1: Input" : step <= 6 ? "Phase 2: Studio" : step <= 8 ? "Phase 3: Trust" : "Phase 4: Broadcast"}
          </Text>
        </View>
      </View>

      {/* ── Mini 11-Step Capsules Row ── */}
      <View style={styles.stepCapsulesRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((s) => {
          const isCurrent = s === step;
          const isDone = s < step;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => (s < step ? setStep(s) : null)}
              style={[
                styles.stepCapsule,
                isCurrent && styles.stepCapsuleActive,
                isDone && styles.stepCapsuleDone,
              ]}
            >
              {isDone ? (
                <MaterialIcons name="check" size={11} color="#ffffff" />
              ) : (
                <Text style={[styles.stepCapsuleText, isCurrent && styles.stepCapsuleTextActive]}>
                  {s}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── MAIN WORKFLOW CARD ── */}
      <View style={styles.stepCard}>
        {/* STEP 1: VOICE INPUT */}
        {step === 1 && (
          <View style={styles.stepContentCenter}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="mic" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 1 • Step 1 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="auto-awesome" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>Whisper On-Device AI</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Tell the Story of Your Craft</Text>
            <Text style={styles.stepDescription}>
              Speak naturally in Hindi, Gondi, Chhattisgarhi, or English. Our AI detects your craft name, metal/wood materials, dimensions, and calculates a fair price.
            </Text>

            {/* Glowing Microphone Hero Area */}
            <View style={styles.micHeroContainer}>
              {isRecording && <View style={styles.micOuterRipple} />}
              <TouchableOpacity
                style={[styles.micCircleBig, isRecording && styles.micCircleRecording]}
                onPress={toggleRecording}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={36}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            {/* Recording Feedback & Soundwave */}
            {isRecording ? (
              <View style={styles.liveRecordingBar}>
                <View style={styles.recordingPulseDot} />
                <Text style={styles.recordingLiveText}>RECORDING NOW — Tap mic when finished</Text>
                <View style={styles.soundwaveRow}>
                  {[10, 22, 14, 32, 40, 24, 16, 36, 44, 28, 18, 30, 12, 26].map((h, idx) => (
                    <View key={idx} style={[styles.soundwaveBar, { height: h }]} />
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.recordingStatusText}>
                {voiceNote
                  ? `✓ Voice recorded (${formatDuration(voiceNote.durationMs)}) — Tap mic to record again`
                  : "Tap the green microphone to speak your craft details"}
              </Text>
            )}

            {/* Audio Playback Card if recorded */}
            {voiceNote && !isRecording && (
              <View style={styles.audioPlayerCard}>
                <TouchableOpacity style={styles.playPauseBtn} onPress={togglePlayback}>
                  <MaterialIcons
                    name={playbackSound ? "stop" : "play-arrow"}
                    size={22}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.audioTitleText}>Your Spoken Craft Recording</Text>
                  <Text style={styles.audioSubText}>
                    Duration: {formatDuration(voiceNote.durationMs)} • Local Audio Cache
                  </Text>
                </View>
                <TouchableOpacity style={styles.reRecordBtn} onPress={toggleRecording}>
                  <MaterialIcons name="refresh" size={15} color={THEME.colors.primary} />
                  <Text style={styles.reRecordText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-detected Speech Transcript Card */}
            <View style={styles.transcriptBox}>
              <View style={styles.transcriptCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MaterialIcons name="auto-awesome" size={15} color={THEME.colors.primary} />
                  <Text style={styles.transcriptLabel}>
                    {isRecording
                      ? livePartial
                        ? "Listening: " + livePartial
                        : "Listening… speak now"
                      : voiceNote
                      ? "Voice Transcription (Auto-detected from speech):"
                      : "Voice Transcription (Auto-fills on speaking, or edit below):"}
                  </Text>
                </View>
                {transcript.trim() ? (
                  <View style={styles.autoDetectedTag}>
                    <Text style={styles.autoDetectedTagText}>✓ Detected</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                style={styles.transcriptInput}
                value={transcript}
                onChangeText={(t) => {
                  setTranscript(t);
                  applyExtraction(t);
                }}
                placeholder="Spoken words will auto-transcribe here once you record..."
                placeholderTextColor={THEME.colors.onSurfaceVariant}
                multiline
              />
              {sttError && !isRecording && (
                <Text style={styles.sttErrorText}>
                  Speech-to-text unavailable ({sttError}). Type your words below instead.
                </Text>
              )}
            </View>

            {/* Quick Inspiration Chips */}
            <View style={styles.quickPromptSection}>
              <Text style={styles.quickPromptTitle}>Or tap a sample craft to test instantly:</Text>
              <View style={styles.quickPromptChipsRow}>
                {[
                  { label: "Dokra Brass Murti", text: "Yeh dokra murti pital aur beeswax thread se banayi hai, Bastar jungle river clay, 18 inch lambi, 4000 rupaye, pooja ke liye" },
                  { label: "Terracotta Lamp", text: "Yeh terracotta mitti ka diya hai, natural red clay, 10 inch, 1200 rupaye, diwali decor" },
                  { label: "Teak Wood Mask", text: "Yeh teak wood ka tribal dewar mask hai, jungle natural polish, 14 inch, 3200 rupaye" },
                ].map((sample, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickSampleChip}
                    onPress={() => {
                      setTranscript(sample.text);
                      applyExtraction(sample.text);
                    }}
                  >
                    <Text style={styles.quickSampleChipText}>{sample.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: CRAFT PHOTOS */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="camera-alt" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 1 • Step 2 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="photo-library" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>{photos.length}/4 Photos Uploaded</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Upload Clear Craft Photos</Text>
            <Text style={styles.stepDescription}>
              High-definition photographs from front, side, and detail angles build buyer confidence on ONDC.
            </Text>

            {/* Studio Guidelines Card */}
            <View style={styles.guideCard}>
              <Text style={styles.guideCardHeader}>STUDIO PHOTOGRAPHY TIPS FOR ARTISANS</Text>
              <View style={styles.guideTipsRow}>
                <View style={styles.guideTipItem}>
                  <MaterialIcons name="wb-sunny" size={16} color={THEME.colors.secondary} />
                  <Text style={styles.guideTipText}>Soft Daylight</Text>
                </View>
                <View style={styles.guideTipItem}>
                  <MaterialIcons name="sync" size={16} color={THEME.colors.secondary} />
                  <Text style={styles.guideTipText}>360° Angles</Text>
                </View>
                <View style={styles.guideTipItem}>
                  <MaterialIcons name="zoom-in" size={16} color={THEME.colors.secondary} />
                  <Text style={styles.guideTipText}>Sharp Texture</Text>
                </View>
              </View>
            </View>

            {/* Photo Slots Grid */}
            <View style={styles.photoSlotsGrid}>
              {[0, 1, 2, 3].map((idx) => {
                const uri = photos[idx];
                const slotLabels = ["Front (Primary)", "Detail Angle", "Base / Underside", "Crafting Proof"];
                if (uri) {
                  return (
                    <View key={idx} style={styles.photoCardFilled}>
                      <Image source={{ uri }} style={styles.photoCardImage} />
                      <View style={styles.photoSlotLabelTag}>
                        <Text style={styles.photoSlotLabelText}>{slotLabels[idx]}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.photoDeleteBtn}
                        onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      >
                        <MaterialIcons name="delete" size={13} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.photoCardEmpty}
                    onPress={() => addPhotos(false)}
                  >
                    <MaterialIcons name="add-a-photo" size={22} color={THEME.colors.outline} />
                    <Text style={styles.photoSlotEmptyTitle}>{slotLabels[idx]}</Text>
                    <Text style={styles.photoSlotEmptySub}>Tap to add</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action Buttons */}
            {photos.length < 4 && (
              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.primaryPhotoBtn} onPress={() => addPhotos(true)}>
                  <MaterialIcons name="photo-camera" size={17} color="#ffffff" />
                  <Text style={styles.primaryPhotoBtnText}>Open Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryPhotoBtn} onPress={() => addPhotos(false)}>
                  <MaterialIcons name="photo-library" size={17} color={THEME.colors.primary} />
                  <Text style={styles.secondaryPhotoBtnText}>Select from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* STEP 3: IMAGE ENHANCEMENT */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="auto-fix-high" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 1 • Step 3 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="bolt" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>On-Device AI Engine</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Real-Time Image Processing</Text>
            <Text style={styles.stepDescription}>
              Photos are resized, normalized to sRGB, and sharpened for ONDC buyer catalogues.
            </Text>

            {enhancing && (
              <View style={styles.enhancingCard}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.enhancingCardTitle}>Processing Studio Enhancement…</Text>
                <Text style={styles.enhancingCardSub}>Color calibration & edge sharpening in progress</Text>
              </View>
            )}

            {!enhancing && (
              <>
                <View style={styles.compareContainer}>
                  <View style={styles.compareCard}>
                    <Image
                      source={{ uri: photos[0] || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600" }}
                      style={styles.compareImg}
                    />
                    <View style={styles.compareBadgeRaw}>
                      <Text style={styles.compareBadgeRawText}>Raw Photo</Text>
                    </View>
                  </View>
                  <View style={styles.compareCard}>
                    <Image
                      source={{ uri: enhanced[0] || photos[0] || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600" }}
                      style={styles.compareImg}
                    />
                    <View style={styles.compareBadgeEnhanced}>
                      <MaterialIcons name="auto-awesome" size={11} color="#ffffff" />
                      <Text style={styles.compareBadgeEnhancedText}>ONDC 4K Studio</Text>
                    </View>
                  </View>
                </View>

                {/* AI Processing Metrics */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <MaterialIcons name="tonality" size={18} color={THEME.colors.primary} />
                    <Text style={styles.metricVal}>+42%</Text>
                    <Text style={styles.metricLbl}>HDR Contrast</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <MaterialIcons name="palette" size={18} color={THEME.colors.primary} />
                    <Text style={styles.metricVal}>sRGB</Text>
                    <Text style={styles.metricLbl}>Color Normalized</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <MaterialIcons name="high-quality" size={18} color={THEME.colors.primary} />
                    <Text style={styles.metricVal}>1200 px</Text>
                    <Text style={styles.metricLbl}>ONDC Calibrated</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 4: CRAFT DETAILS */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="description" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 2 • Step 4 of 11</Text>
              </View>
              {extracted && (
                <View style={styles.whisperEnginePill}>
                  <MaterialIcons name="check-circle" size={12} color={THEME.colors.primary} />
                  <Text style={styles.whisperEngineText}>{extracted.confidence}% Field Match</Text>
                </View>
              )}
            </View>

            <Text style={styles.stepHeading}>Review Extracted Specifications</Text>
            <Text style={styles.stepDescription}>
              Information auto-extracted from your voice lore. You can edit any details before publishing.
            </Text>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <MaterialIcons name="title" size={15} color={THEME.colors.primary} />
                  <Text style={styles.inputLabelNew}>Craft Product Title</Text>
                </View>
                <TextInput
                  style={styles.textInputNew}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Handmade Bastar Dokra Brass Murti"
                  placeholderTextColor={THEME.colors.onSurfaceVariant}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <MaterialIcons name="category" size={15} color={THEME.colors.primary} />
                  <Text style={styles.inputLabelNew}>Primary Materials</Text>
                </View>
                <TextInput
                  style={styles.textInputNew}
                  value={materials}
                  onChangeText={setMaterials}
                  placeholder="e.g. Brass, River Clay, Beeswax Thread"
                  placeholderTextColor={THEME.colors.onSurfaceVariant}
                />
                <View style={styles.materialChipRow}>
                  {["Dokra Brass", "Beeswax", "River Clay", "Teak Wood", "Tussar Silk"].map((mat) => (
                    <TouchableOpacity
                      key={mat}
                      style={styles.matChip}
                      onPress={() => setMaterials((prev) => (prev ? `${prev}, ${mat}` : mat))}
                    >
                      <Text style={styles.matChipText}>+ {mat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <MaterialIcons name="straighten" size={15} color={THEME.colors.primary} />
                  <Text style={styles.inputLabelNew}>Dimensions / Size</Text>
                </View>
                <TextInput
                  style={styles.textInputNew}
                  value={dimensions}
                  onChangeText={setDimensions}
                  placeholder="e.g. 18 in height × 6 in width"
                  placeholderTextColor={THEME.colors.onSurfaceVariant}
                />
              </View>

              <View style={styles.ondcClassificationCard}>
                <MaterialIcons name="tag" size={16} color={THEME.colors.secondary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.ondcClassTitle}>ONDC Category Taxonomy</Text>
                  <Text style={styles.ondcClassValue}>Home & Living &gt; Indian Handicrafts &gt; Metalcraft</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: PRICE RECOMMENDATION */}
        {step === 5 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="payments" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 2 • Step 5 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="shield" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>Fair Wage Engine</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>ONDC Fair Market Pricing</Text>
            <Text style={styles.stepDescription}>
              Calculated using artisan labor hours, metal casting costs, and current buyer demand on ONDC.
            </Text>

            <View style={styles.priceHeroCard}>
              <Text style={styles.priceHeroLabel}>RECOMMENDED RETAIL PRICE</Text>
              <Text style={styles.priceHeroAmount}>₹{priceNum ? priceNum.toLocaleString() : "4,000"}</Text>
              <Text style={styles.priceHeroHelper}>Optimal price point for high conversion on Paytm & Mystore</Text>

              <View style={styles.spectrumBarContainer}>
                <View style={styles.spectrumTrack}>
                  <View style={styles.spectrumSegmentFloor} />
                  <View style={styles.spectrumSegmentRecommended} />
                  <View style={styles.spectrumSegmentCeiling} />
                </View>
                <View style={styles.spectrumLabelsRow}>
                  <Text style={styles.spectrumLabel}>Floor: ₹{floor.toLocaleString()}</Text>
                  <Text style={[styles.spectrumLabel, { color: THEME.colors.primary, fontWeight: "700" }]}>
                    Fair: ₹{(priceNum || 4000).toLocaleString()}
                  </Text>
                  <Text style={styles.spectrumLabel}>Ceiling: ₹{Math.round((priceNum || 4000) * 1.15).toLocaleString()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownCardTitle}>TRANSPARENT VALUE BREAKDOWN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Raw Brass & Wax Casting</Text>
                <Text style={styles.breakdownVal}>₹1,000</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Artisan Labor (40 skilled hours)</Text>
                <Text style={styles.breakdownVal}>₹2,400</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Direct Artisan Margin</Text>
                <Text style={[styles.breakdownVal, { color: THEME.colors.primary }]}>₹600</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownRowHighlight]}>
                <Text style={styles.breakdownLabelBold}>ONDC Network Commission</Text>
                <Text style={styles.breakdownValGreen}>₹0 (100% Direct)</Text>
              </View>
            </View>

            <View style={styles.priceInputRowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabelNew}>Your Final Price (₹)</Text>
                <TextInput
                  style={styles.priceInputField}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="4000"
                />
              </View>
              <View style={styles.priceQuickStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setPrice(String(Math.max(500, (priceNum || 4000) - 200)))}
                >
                  <Text style={styles.stepperBtnText}>-₹200</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setPrice(String((priceNum || 4000) + 200))}
                >
                  <Text style={styles.stepperBtnText}>+₹200</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STEP 6: PRICE GUARD */}
        {step === 6 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="shield" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 2 • Step 6 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="verified" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>Price Guard Active</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Artisan Price Guard Protection</Text>
            <Text style={styles.stepDescription}>
              Guarantees you never sell below cost and ensures fair tribal compensation across every ONDC order.
            </Text>

            <View style={styles.shieldHeroCard}>
              <View style={styles.shieldIconContainer}>
                <MaterialIcons name="security" size={28} color={THEME.colors.primary} />
              </View>
              <Text style={styles.shieldHeroTitle}>Certified Safe Profit Margin</Text>
              <Text style={styles.shieldHeroBody}>
                Your price of ₹{(priceNum || 4000).toLocaleString()} provides a safe <Text style={{ fontWeight: "700", color: THEME.colors.primary }}>+{margin}% margin</Text> above the cost floor.
              </Text>
            </View>

            <View style={styles.payoutSummaryCard}>
              <Text style={styles.breakdownCardTitle}>DIRECT BANK SETTLEMENT SUMMARY</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Buyer Payment</Text>
                <Text style={styles.breakdownVal}>₹{(priceNum || 4000).toLocaleString()}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Logistics & Insurance</Text>
                <Text style={styles.breakdownVal}>Paid by buyer</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Intermediary Deduction</Text>
                <Text style={styles.breakdownValGreen}>₹0 (Zero Middleman)</Text>
              </View>
              <View style={[styles.breakdownRow, styles.payoutTotalRow]}>
                <Text style={styles.payoutTotalLabel}>Net Credited to Your Account</Text>
                <Text style={styles.payoutTotalValue}>₹{Math.round((priceNum || 4000) * 0.892).toLocaleString()}</Text>
              </View>
              <Text style={styles.payoutSettlementNote}>
                ⚡ Settles via NEFT/UPI within 24 hours of delivery confirmation.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 7: AI CONFIDENCE */}
        {step === 7 && (
          <View style={styles.stepContentCenter}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="speed" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 3 • Step 7 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="bolt" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>Instant Routing</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>AI Quality Score & Routing</Text>
            <Text style={styles.stepDescription}>
              Our quality verification algorithms evaluate audio clarity, photo resolution, and material authenticity.
            </Text>

            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeCircle}>
                <Text style={styles.gaugeScoreText}>{confidence}%</Text>
                <Text style={styles.gaugeScoreSub}>Quality Score</Text>
              </View>
            </View>

            <View style={styles.fastTrackCard}>
              <MaterialIcons name="electric-bolt" size={24} color="#f59e0b" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fastTrackTitle}>
                  {confidence >= 90 ? "Fast-Track Auto-Approval" : "Ambassador Verification"}
                </Text>
                <Text style={styles.fastTrackDesc}>
                  {confidence >= 90
                    ? "Your craft scored above 90% and qualifies for instant live broadcasting to ONDC with zero waiting queue."
                    : "Your craft will be verified by your local Village Field Ambassador within 4 hours."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 8: COMPLIANCE CHECK */}
        {step === 8 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="verified-user" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 3 • Step 8 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="policy" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>ONDC Protocol v2.0</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Compliance & GI Certification</Text>
            <Text style={styles.stepDescription}>
              Final verification before your seller node broadcasts this item to buyer applications nationwide.
            </Text>

            <View style={styles.complianceCard}>
              {[
                { title: "Geographical Indication (GI Tag)", val: "Verified: Bastar Dokra (Govt ID #382)", icon: "workspace-premium" },
                { title: "ONDC BPP Seller Node", val: "Active: bpp.junglemarket.in (200 OK)", icon: "dns" },
                { title: "Direct Escrow Settlement", val: "Connected: Bank of Baroda (•••• 4291)", icon: "account-balance" },
                { title: "Artisan Protection Protocol", val: "Covered: Transit Insurance & Return SLA", icon: "shield" },
              ].map((item, idx) => (
                <View key={idx} style={styles.complianceCheckItem}>
                  <View style={styles.checkCircleGreen}>
                    <MaterialIcons name="check" size={13} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.complianceCheckTitle}>{item.title}</Text>
                    <Text style={styles.complianceCheckVal}>{item.val}</Text>
                  </View>
                  <MaterialIcons name={item.icon} size={18} color={THEME.colors.outline} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 9: BROADCASTING */}
        {step === 9 && (
          <View style={styles.stepContentCenter}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="wifi-tethering" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 4 • Step 9 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="public" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>National Gateway</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>Broadcasting to Buyer Apps</Text>
            <Text style={styles.stepDescription}>
              Your seller BPP node is communicating with the national ONDC Gateway to syndicate your catalog item.
            </Text>

            <View style={styles.networkNodesGrid}>
              {[
                { app: "Paytm Mall", desc: "Crafts Search & Home Feed", status: "SYNCED" },
                { app: "Mystore ONDC", desc: "Tribal Artisan Showcase", status: "SYNCED" },
                { app: "Pincode (PhonePe)", desc: "Hyperlocal Discovery Index", status: "SYNCED" },
                { app: "Magicpin & Tata Neu", desc: "ONDC Open Marketplace", status: "BROADCASTING" },
              ].map((node, idx) => (
                <View key={idx} style={styles.networkNodeCard}>
                  <View style={styles.nodeHeaderRow}>
                    <Text style={styles.nodeAppName}>{node.app}</Text>
                    <View style={styles.nodeStatusBadge}>
                      <Text style={styles.nodeStatusText}>{node.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.nodeAppDesc}>{node.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 10: PUBLISHED LIVE */}
        {step === 10 && (
          <View style={styles.stepContentCenter}>
            <View style={styles.congratsBadge}>
              <MaterialIcons name="stars" size={32} color="#ffffff" />
            </View>
            <Text style={styles.successHeading}>Published Live to ONDC!</Text>
            <Text style={styles.stepDescription}>
              Congratulations! Your handmade craft is now live across all ONDC buyer applications in India.
            </Text>

            <View style={styles.liveListingCard}>
              <Image
                source={{ uri: enhanced[0] || photos[0] || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600" }}
                style={styles.liveListingThumb}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.liveTagRow}>
                  <View style={styles.livePulseDotGreen} />
                  <Text style={styles.liveTagText}>LIVE ON ONDC</Text>
                </View>
                <Text style={styles.liveListingTitle} numberOfLines={1}>
                  {title || "Handmade Bastar Dokra Murti"}
                </Text>
                <Text style={styles.liveListingPrice}>₹{(priceNum || 4000).toLocaleString()}</Text>
                <Text style={styles.liveListingMeta}>{materials || "Dokra Brass & River Clay"}</Text>
              </View>
            </View>

            <View style={styles.ondcGlobalIdBox}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.ondcGlobalLabel}>GLOBAL ONDC PRODUCT ID</Text>
                <TouchableOpacity onPress={() => Alert.alert("Copied", "Product ID copied to clipboard!")}>
                  <Text style={styles.copyIdText}>Copy ID</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.ondcGlobalValue}>ONDC-BAP-CG-DOKRA-{Date.now().toString().slice(-4)}</Text>
            </View>
          </View>
        )}

        {/* STEP 11: FULFILLMENT READINESS */}
        {step === 11 && (
          <View style={styles.stepContent}>
            <View style={styles.phaseBadgeRow}>
              <View style={styles.badgePillPrimary}>
                <MaterialIcons name="local-shipping" size={12} color="#ffffff" />
                <Text style={styles.badgePillText}>Phase 4 • Step 11 of 11</Text>
              </View>
              <View style={styles.whisperEnginePill}>
                <MaterialIcons name="done-all" size={12} color={THEME.colors.primary} />
                <Text style={styles.whisperEngineText}>Ready for Orders</Text>
              </View>
            </View>

            <Text style={styles.stepHeading}>You Are Ready to Fulfill Orders!</Text>
            <Text style={styles.stepDescription}>
              Here is what happens as soon as a customer orders your craft from any app in India:
            </Text>

            <View style={styles.fulfillmentStepsCard}>
              {[
                { step: "1", title: "Instant Audio Alert on Phone", desc: "Your phone speaks aloud the customer's city and the order amount in Hindi or Chhattisgarhi.", icon: "volume-up" },
                { step: "2", title: "Doorstep Courier Pickup", desc: "Logistics partners (Shadowfax/Delhivery) arrive at your village with a pre-printed barcode label.", icon: "local-shipping" },
                { step: "3", title: "Direct Bank Transfer in 24 Hours", desc: "Full ₹" + Math.round((priceNum || 4000) * 0.892).toLocaleString() + " is credited directly to Bank of Baroda with zero cuts.", icon: "account-balance-wallet" },
              ].map((item) => (
                <View key={item.step} style={styles.fulfillmentStepRow}>
                  <View style={styles.fulfillmentStepNum}>
                    <Text style={styles.fulfillmentStepNumText}>{item.step}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name={item.icon} size={16} color={THEME.colors.primary} />
                      <Text style={styles.fulfillmentStepTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.fulfillmentStepDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Workflow Navigation Controls ── */}
        <View style={styles.workflowControlRow}>
          {step > 1 && step < 10 && (
            <TouchableOpacity
              style={styles.workflowBackBtn}
              onPress={() => setStep(step - 1)}
            >
              <MaterialIcons name="arrow-back" size={15} color={THEME.colors.onSurface} />
              <Text style={styles.workflowBackBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 10 ? (
            <TouchableOpacity
              style={styles.workflowNextBtn}
              onPress={goNext}
              activeOpacity={0.88}
            >
              <Text style={styles.workflowNextBtnText}>
                {step === 9 ? "Publish to ONDC Live Network 🚀" : `Continue to Step ${step + 1} →`}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.workflowDoneBtn}
              onPress={() => onFinish(buildCraft())}
              activeOpacity={0.88}
            >
              <MaterialIcons name="dashboard" size={17} color="#ffffff" />
              <Text style={styles.workflowDoneBtnText}>Return to Artisan Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ----------------------------------------------------
// 3. ARTISAN AMOUNT & WALLET STATUS
// ----------------------------------------------------
export function ArtisanAmountScreen({ user, orders, onWithdraw }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Amount & Wallet Status</Text>
        <Text style={styles.screenSubtitle}>Direct Bank Settlement on ONDC</Text>
      </View>

      <View style={styles.walletHeroCard}>
        <Text style={styles.walletHeroLabel}>Available Wallet Balance</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.walletHeroAmount}>₹{user.walletBalance.toLocaleString()}</Text>
          <TouchableOpacity style={styles.withdrawBtn} onPress={onWithdraw}>
            <Text style={styles.withdrawBtnText}>Withdraw to Bank</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.amountBox}>
          <Text style={styles.statLabel}>Pending Settlement</Text>
          <Text style={styles.statValueGold}>₹{user.pendingPayout.toLocaleString()}</Text>
          <Text style={styles.amountHelperText}>Releases on buyer delivery</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.statLabel}>Platform Deductions</Text>
          <Text style={styles.statValueGreen}>0% Platform Fee</Text>
          <Text style={styles.amountHelperText}>100% direct artisan network</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeadline, { marginTop: 20 }]}>
        Recent Bank Transfers
      </Text>
      {orders.map((o) => (
        <View key={o.id} style={styles.transferRowCard}>
          <View>
            <Text style={styles.transferTitle}>{o.productTitle}</Text>
            <Text style={styles.transferSubtitle}>
              {o.id} • {o.date}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.transferAmountGreen}>
              +₹{o.artisanPayout.toLocaleString()}
            </Text>
            <Text style={styles.transferStatusText}>
              {o.status === "DELIVERED" ? "Settled" : "In Escrow"}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 4. ARTISAN ORDERS SCREEN
// ----------------------------------------------------
export function ArtisanOrdersScreen({ orders, onAdvanceOrder }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Artisan Orders & Logistics</Text>
        <Text style={styles.screenSubtitle}>Fulfill buyer orders through ONDC pickup</Text>
      </View>

      {orders.map((order) => (
        <View key={order.id} style={styles.orderCardBox}>
          <View style={styles.orderHeaderRow}>
            <Text style={styles.orderIdText}>{order.id}</Text>
            <Text style={styles.statusPill}>{order.status}</Text>
          </View>

          <View style={styles.orderBodyRow}>
            <Image
              source={{ uri: order.productImage }}
              style={styles.orderProductImage}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.orderProductTitle} numberOfLines={1}>
                {order.productTitle}
              </Text>
              <Text style={styles.orderBuyerText}>
                {order.buyerName} • {order.buyerCity}
              </Text>
              <Text style={styles.orderPayoutText}>
                ₹{order.artisanPayout.toLocaleString()} Payout
              </Text>
            </View>
          </View>

          {order.status === "CONFIRMED" && (
            <TouchableOpacity
              style={styles.advanceStatusBtn}
              onPress={() => onAdvanceOrder(order.id, "PROCESSING")}
            >
              <Text style={styles.advanceStatusBtnText}>Pack in Bamboo Box</Text>
            </TouchableOpacity>
          )}

          {order.status === "PROCESSING" && (
            <TouchableOpacity
              style={[styles.advanceStatusBtn, { backgroundColor: THEME.colors.secondary }]}
              onPress={() => onAdvanceOrder(order.id, "SHIPPED")}
            >
              <Text style={styles.advanceStatusBtnText}>Hand Over to Delhivery</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// ----------------------------------------------------
// 5. ARTISAN GUILD PROFILE & ONBOARDING QR
// ----------------------------------------------------
export function ArtisanGuildScreen({ user }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.guildProfileCard}>
        <Image source={{ uri: user.avatar }} style={styles.guildAvatar} />
        <Text style={styles.guildName}>{user.name}</Text>
        <Text style={styles.guildVillage}>{user.village}</Text>
        <View style={styles.giBadgePill}>
          <Text style={styles.giBadgeText}>{user.giCertificateNumber}</Text>
        </View>
      </View>

      <View style={styles.networkQrCard}>
        <Text style={styles.networkQrHeading}>Artisan Network QR</Text>
        <Text style={styles.networkQrDescription}>
          Share this QR code with other artisans in your village to connect them to Jungle Market ONDC node.
        </Text>
        <View style={styles.qrCodeBox}>
          <Image
            source={{
              uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://junglemarket.in/join/${user.referralCode}`,
            }}
            style={{ width: 140, height: 140 }}
          />
        </View>
        <Text style={styles.referralCodeText}>
          Referral Code: {user.referralCode}
        </Text>
      </View>
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
  budgetCard: {
    backgroundColor: THEME.colors.primaryDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#072B1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  guideCardHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  guideTipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  guideTipItem: {
    alignItems: "center",
    flex: 1,
  },
  guideTipText: {
    fontSize: 10,
    fontWeight: "500",
    color: THEME.colors.textDark,
    textAlign: "center",
    marginTop: 3,
  },
  photoSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  photoCardFilled: {
    width: "48%",
    aspectRatio: 1.15,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    position: "relative",
  },
  photoCardImage: {
    width: "100%",
    height: "100%",
  },
  photoSlotLabelTag: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  photoSlotLabelText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "600",
  },
  photoDeleteBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(180,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoCardEmpty: {
    width: "48%",
    aspectRatio: 1.15,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: THEME.colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.surfaceContainerLow,
  },
  photoSlotEmptyTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.colors.textDark,
    marginTop: 3,
  },
  photoSlotEmptySub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  photoActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  primaryPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
  },
  primaryPhotoBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  secondaryPhotoBtnText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  enhancingCard: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: THEME.colors.surfaceWarm,
    borderRadius: 12,
    marginVertical: 10,
  },
  enhancingCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 8,
  },
  enhancingCardSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  compareContainer: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  compareCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    position: "relative",
  },
  compareImg: {
    width: "100%",
    height: "100%",
  },
  compareBadgeRaw: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  compareBadgeRawText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "600",
  },
  compareBadgeEnhanced: {
    position: "absolute",
    bottom: 5,
    left: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  compareBadgeEnhancedText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
    marginTop: 3,
  },
  metricLbl: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  formCard: {
    width: "100%",
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  inputLabelNew: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textDark,
  },
  textInputNew: {
    height: 42,
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: THEME.colors.textDark,
  },
  materialChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  matChip: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  matChipText: {
    fontSize: 10,
    fontWeight: "500",
    color: THEME.colors.primary,
  },
  ondcClassificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceWarm,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 4,
  },
  ondcClassTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.colors.secondary,
    letterSpacing: 0.5,
  },
  ondcClassValue: {
    fontSize: 11,
    fontWeight: "500",
    color: THEME.colors.textDark,
    marginTop: 2,
  },
  priceHeroCard: {
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    alignItems: "center",
    marginVertical: 10,
  },
  priceHeroLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.colors.secondary,
    letterSpacing: 0.5,
  },
  priceHeroAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.colors.primary,
    marginVertical: 3,
  },
  priceHeroHelper: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: "center",
  },
  spectrumBarContainer: {
    width: "100%",
    marginTop: 12,
  },
  spectrumTrack: {
    flexDirection: "row",
    height: 7,
    borderRadius: 3.5,
    overflow: "hidden",
  },
  spectrumSegmentFloor: {
    flex: 1,
    backgroundColor: "#ffbe94",
  },
  spectrumSegmentRecommended: {
    flex: 2,
    backgroundColor: THEME.colors.primary,
  },
  spectrumSegmentCeiling: {
    flex: 1,
    backgroundColor: THEME.colors.tertiaryAccent,
  },
  spectrumLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  spectrumLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontWeight: "500",
  },
  breakdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  breakdownCardTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  breakdownLabel: {
    fontSize: 11,
    color: THEME.colors.textDark,
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textDark,
  },
  breakdownRowHighlight: {
    borderBottomWidth: 0,
    backgroundColor: THEME.colors.surfaceContainerLow,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginTop: 4,
  },
  breakdownLabelBold: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  breakdownValGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  priceInputRowCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  priceInputField: {
    height: 42,
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textDark,
    marginTop: 3,
  },
  priceQuickStepper: {
    flexDirection: "row",
    gap: 5,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  shieldHeroCard: {
    backgroundColor: "#e8f8e7",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#b1f1c3",
    alignItems: "center",
    marginVertical: 10,
  },
  shieldIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    ...THEME.shadows.sm,
  },
  shieldHeroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f5d3a",
  },
  shieldHeroBody: {
    fontSize: 11,
    color: "#1f5d3a",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 3,
  },
  payoutSummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 6,
  },
  payoutTotalRow: {
    backgroundColor: THEME.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
    borderBottomWidth: 0,
  },
  payoutTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
  },
  payoutTotalValue: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  payoutSettlementNote: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  gaugeContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  gaugeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3.5,
    borderColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.surfaceContainerLow,
    ...THEME.shadows.sm,
  },
  gaugeScoreText: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  gaugeScoreSub: {
    fontSize: 9,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  fastTrackCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginTop: 6,
  },
  fastTrackTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  fastTrackDesc: {
    fontSize: 10,
    color: "#92400e",
    lineHeight: 15,
    marginTop: 2,
  },
  complianceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 8,
  },
  complianceCheckItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  checkCircleGreen: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  complianceCheckTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textDark,
  },
  complianceCheckVal: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  networkNodesGrid: {
    width: "100%",
    gap: 6,
    marginVertical: 10,
  },
  networkNodeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  nodeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nodeAppName: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
  },
  nodeStatusBadge: {
    backgroundColor: THEME.colors.surfaceContainerLow,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: THEME.colors.primaryContainer,
  },
  nodeStatusText: {
    fontSize: 8,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  nodeAppDesc: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  congratsBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    ...THEME.shadows.md,
  },
  liveListingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    width: "100%",
    marginVertical: 10,
  },
  liveListingThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  liveTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  livePulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1f5d3a",
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1f5d3a",
    letterSpacing: 0.5,
  },
  liveListingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.textDark,
  },
  liveListingPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.colors.primary,
    marginTop: 2,
  },
  liveListingMeta: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  ondcGlobalIdBox: {
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: "100%",
  },
  ondcGlobalLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: THEME.colors.secondary,
    letterSpacing: 0.5,
  },
  copyIdText: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  ondcGlobalValue: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: THEME.colors.primary,
    marginTop: 3,
  },
  fulfillmentStepsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 8,
  },
  fulfillmentStepRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  fulfillmentStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fulfillmentStepNumText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  fulfillmentStepTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.textDark,
  },
  fulfillmentStepDesc: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  workflowControlRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  workflowBackBtn: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  workflowBackBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  workflowNextBtn: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    ...THEME.shadows.sm,
  },
  workflowNextBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  workflowDoneBtn: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    ...THEME.shadows.sm,
  },
  workflowDoneBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Amount & Wallet
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
  walletHeroCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: 18,
    marginBottom: 14,
  },
  walletHeroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
  walletHeroAmount: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },
  withdrawBtn: {
    backgroundColor: THEME.colors.secondary,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  withdrawBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  amountBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  amountHelperText: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 4,
  },
  transferRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 8,
  },
  transferTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.onSurface,
  },
  transferSubtitle: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 2,
  },
  transferAmountGreen: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f5d3a",
  },
  transferStatusText: {
    fontSize: 10,
    color: THEME.colors.onSurfaceVariant,
    marginTop: 1,
  },

  // Orders
  orderCardBox: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 12,
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceContainer,
  },
  orderIdText: {
    fontFamily: "monospace",
    fontWeight: "600",
    fontSize: 12,
    color: THEME.colors.primary,
  },
  orderBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  orderProductImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  advanceStatusBtn: {
    backgroundColor: THEME.colors.primary,
    height: 42,
    borderRadius: THEME.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  advanceStatusBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Guild Profile
  guildProfileCard: {
    backgroundColor: "#ffffff",
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
    marginBottom: 14,
  },
  guildAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: THEME.colors.primaryContainer,
    marginBottom: 10,
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
    marginBottom: 8,
  },
  giBadgePill: {
    backgroundColor: THEME.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  giBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  networkQrCard: {
    backgroundColor: THEME.colors.surfaceContainerLow,
    borderRadius: THEME.borderRadius.lg,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceContainer,
  },
  networkQrHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  networkQrDescription: {
    fontSize: 11,
    color: THEME.colors.onSurfaceVariant,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 16,
  },
  qrCodeBox: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 12,
    marginVertical: 10,
  },
  referralCodeText: {
    fontSize: 11,
    color: THEME.colors.secondary,
    fontWeight: "600",
  },
});
