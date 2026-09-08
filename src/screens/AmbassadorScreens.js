// Jungle Market — Ambassador Screens
// Architecture role: Review low-confidence crafts flagged by AI analysis.
// Approve → craft goes live on ONDC.   Reject → craft returns to artisan.
// Simple English rules: short sentences, active voice, no contractions.

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { THEME } from '../theme/theme';
import { startVoiceRecording, stopVoiceRecording, startLiveTranscription, formatDuration } from '../utils/media';
import { JUNGLE_DATA } from '../data/jungleData';

// ─────────────────────────────────────────────
// 1. Ambassador Dashboard — Verification Queue
// ─────────────────────────────────────────────
export function AmbassadorDashboardScreen({ onNavigate, onVerifyItem }) {
  const amb = JUNGLE_DATA.ambassador;
  const [queue, setQueue] = useState(amb.verificationQueue);
  const [approvedCount, setApprovedCount] = useState(amb.verifiedCount);

  const handleQuickApprove = (itemId) => {
    setQueue((prev) => prev.filter((item) => item.id !== itemId));
    setApprovedCount((c) => c + 1);
    Alert.alert('Craft Approved', 'The item is now live on the ONDC network.');
  };

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Profile card */}
      <View style={s.card}>
        <View style={s.row}>
          <Image source={{ uri: amb.avatar }} style={s.avatar} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={s.pillRow}>
              <View style={s.certPill}>
                <MaterialIcons name="verified" size={13} color={THEME.colors.primary} />
                <Text style={s.certPillText}>Field Lead</Text>
              </View>
            </View>
            <Text style={s.name}>{amb.name}</Text>
            <Text style={s.muted}>{amb.location}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Pending</Text>
            <Text style={[s.statValue, { color: THEME.colors.warning }]}>{queue.length}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Verified</Text>
            <Text style={[s.statValue, { color: THEME.colors.primary }]}>{approvedCount}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Honorarium</Text>
            <Text style={[s.statValue, { color: THEME.colors.bark }]}>₹{amb.earnedHonorarium.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* Queue header */}
      <View style={[s.row, { marginBottom: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>Physical Inspection Queue</Text>
          <Text style={s.muted}>Items flagged by AI vision with confidence below 90%.</Text>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{queue.length}</Text>
        </View>
      </View>

      {/* Queue cards */}
      {queue.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <MaterialIcons name="task-alt" size={40} color={THEME.colors.primary} />
          <Text style={[s.sectionTitle, { marginTop: 10 }]}>Queue Complete</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            You checked every flagged craft. All listings are live on ONDC.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.id} style={s.card}>
            {/* Top row: image + meta */}
            <View style={s.row}>
              <Image source={{ uri: item.image }} style={s.thumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <Text style={s.categoryTag}>{item.category}</Text>
                  <View style={[s.confPill, item.aiConfidenceScore < 70 ? s.confLow : s.confMed]}>
                    <Text style={s.confText}>AI {item.aiConfidenceScore}%</Text>
                  </View>
                </View>
                <Text style={s.itemTitle} numberOfLines={2}>{item.productTitle}</Text>
                <Text style={s.muted}>{item.artisanName} • {item.artisanVillage}</Text>
                <Text style={s.price}>₹{item.price}</Text>
              </View>
            </View>

            {/* Reason box */}
            <View style={s.reasonBox}>
              <MaterialIcons name="info-outline" size={16} color={THEME.colors.warning} />
              <Text style={s.reasonText}>{item.reasonForFlag}</Text>
            </View>

            {/* Actions */}
            <View style={[s.row, { gap: 10, marginTop: 12 }]}>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => onVerifyItem ? onVerifyItem(item) : onNavigate('verify')}
              >
                <MaterialIcons name="checklist" size={18} color={THEME.colors.primary} />
                <Text style={s.secondaryBtnText}>Full Inspection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.approveBtn} onPress={() => handleQuickApprove(item.id)}>
                <MaterialIcons name="check-circle" size={18} color="#fff" />
                <Text style={s.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// 2. Ambassador Full Verification Screen
// ─────────────────────────────────────────────
export function AmbassadorVerificationScreen({ item, onNavigate, onComplete }) {
  const activeItem = item || JUNGLE_DATA.ambassador.verificationQueue[0];

  const [checks, setChecks] = useState({
    purity: true,
    dimensions: true,
    fairPrice: true,
    packaging: false
  });
  // Real field audio stamp (expo-audio microphone recording) + live STT.
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStamp, setAudioStamp] = useState(null); // { uri, durationMs }
  const [stampPartial, setStampPartial] = useState('');
  const transcriberRef = useRef(null);
  const [notes, setNotes] = useState('Metal weight matches Dokra brass ratio. Sal leaf packaging confirmed.');

  const toggle = (key) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAudioStamp = async () => {
    if (isRecording) {
      if (transcriberRef.current) {
        transcriberRef.current.stop();
        transcriberRef.current = null;
      }
      const note = await stopVoiceRecording(recording);
      setIsRecording(false);
      setRecording(null);
      if (note.uri) setAudioStamp(note);
      else Alert.alert('Recording failed', 'Could not save the audio note.');
      return;
    }
    try {
      const rec = await startVoiceRecording();
      setRecording(rec);
      setIsRecording(true);
      setStampPartial('');
      // Spoken field notes append into the notes box in real time.
      transcriberRef.current = startLiveTranscription('en-IN', {
        onPartial: (text) => setStampPartial(text),
        onFinal: (text) => {
          setStampPartial('');
          if (!text) return;
          setNotes((prev) => (prev ? prev + ' ' + text : text));
        },
        onError: () => {},
        onEnd: () => {
          transcriberRef.current = null;
        },
      });
    } catch (e) {
      Alert.alert('Microphone unavailable', e.message || 'Permission denied.');
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Verified',
      'Digital signature applied. Item published to ONDC.',
      [{ text: 'OK', onPress: () => { if (onComplete) onComplete(activeItem.id); onNavigate('queue'); } }]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Revision Requested',
      'Craft returned to artisan for corrections.',
      [{ text: 'OK', onPress: () => onNavigate('queue') }]
    );
  };

  const checkItems = [
    { key: 'purity', title: 'Authentic Raw Materials', desc: 'Brass, beeswax thread, no synthetic filler.' },
    { key: 'dimensions', title: 'Physical Dimensions Confirmed', desc: 'Height and weight match the catalog listing.' },
    { key: 'fairPrice', title: 'Direct Artisan Payout Floor', desc: `Artisan receives ₹${activeItem.costFloor} minimum.` },
    { key: 'packaging', title: 'Eco-Friendly Packaging', desc: 'Sal leaves and straw protection ready.' }
  ];

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Back */}
      <TouchableOpacity style={[s.row, { marginBottom: 12, gap: 6 }]} onPress={() => onNavigate('queue')}>
        <MaterialIcons name="arrow-back" size={20} color={THEME.colors.textDark} />
        <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.colors.textDark }}>Back to Queue</Text>
      </TouchableOpacity>

      {/* Item header */}
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        <Image source={{ uri: activeItem.image }} style={{ width: '100%', height: 180 }} />
        <View style={{ padding: 16 }}>
          <Text style={s.itemTitle}>{activeItem.productTitle}</Text>
          <Text style={s.muted}>Artisan: {activeItem.artisanName} • {activeItem.artisanVillage}</Text>
          <View style={[s.row, { justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: THEME.colors.border, paddingTop: 8 }]}>
            <Text style={s.price}>Listed: ₹{activeItem.price}</Text>
            <Text style={[s.muted, { fontSize: 13 }]}>Floor: ₹{activeItem.costFloor}</Text>
          </View>
        </View>
      </View>

      {/* Flag reason */}
      <View style={s.reasonBox}>
        <MaterialIcons name="warning" size={18} color={THEME.colors.warning} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.colors.textDark }}>Reason for Physical Check</Text>
          <Text style={s.reasonText}>{activeItem.reasonForFlag}</Text>
        </View>
      </View>

      {/* Checklist */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Inspection Checklist</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>Complete every check before signing the certificate.</Text>

        {checkItems.map((ci) => (
          <TouchableOpacity key={ci.key} style={s.checkRow} onPress={() => toggle(ci.key)}>
            <MaterialIcons
              name={checks[ci.key] ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={checks[ci.key] ? THEME.colors.primary : THEME.colors.textMuted}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: THEME.colors.textDark }}>{ci.title}</Text>
              <Text style={s.muted}>{ci.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Audio stamp + notes */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Field Audio Stamp</Text>
        <Text style={[s.muted, { marginBottom: 10 }]}>Record the artisan describing their process.</Text>

        <View style={s.audioRow}>
          <TouchableOpacity
            style={[s.micBtn, (audioStamp || isRecording) && { backgroundColor: THEME.colors.primary }]}
            onPress={toggleAudioStamp}
          >
            <MaterialIcons name={isRecording ? 'stop' : audioStamp ? 'graphic-eq' : 'mic'} size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.colors.textDark }}>
              {isRecording
                ? stampPartial
                  ? 'Listening: ' + stampPartial
                  : 'Recording… tap to stop'
                : audioStamp
                  ? `Audio Stamp Attached (${formatDuration(audioStamp.durationMs)})`
                  : 'Tap to record artisan note'}
            </Text>
            <Text style={s.muted}>Halbi / Gondi dialect • saved on device</Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '500', color: THEME.colors.textDark, marginTop: 14, marginBottom: 6 }}>Inspector Notes</Text>
        <TextInput
          style={s.textArea}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Action buttons */}
      <View style={[s.row, { gap: 12, marginTop: 8 }]}>
        <TouchableOpacity style={s.rejectBtn} onPress={handleReject}>
          <MaterialIcons name="close" size={18} color={THEME.colors.error} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: THEME.colors.error }}>Revise</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.approveBtn, { flex: 1.6, paddingVertical: 14 }]} onPress={handleApprove}>
          <MaterialIcons name="verified-user" size={18} color="#fff" />
          <Text style={s.approveBtnText}>Sign & Publish ONDC</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// 3. Ambassador Network & Scan QR Screen (Stitch Frame)
// ─────────────────────────────────────────────
export function AmbassadorNetworkScreen({ ambassador, onOnboardArtisan }) {
  const amb = ambassador || JUNGLE_DATA.ambassador;

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Network Header */}
      <View style={s.card}>
        <View style={[s.row, { justifyContent: "space-between", marginBottom: 8 }]}>
          <Text style={s.sectionTitle}>Field Network & Guild</Text>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{amb.networkArtisansCount} Artisans</Text>
          </View>
        </View>
        <Text style={s.muted}>
          Active tribal makers registered through your field ambassador link.
        </Text>

        {/* QR Code Container */}
        <View style={{ alignItems: "center", marginVertical: 18, padding: 16, backgroundColor: THEME.colors.surfaceWarm, borderRadius: THEME.radius.md, borderWidth: 1, borderColor: THEME.colors.borderLight }}>
          <MaterialIcons name="qr-code-2" size={108} color={THEME.colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: THEME.colors.textDark, marginTop: 8 }}>
            Referral Code: {amb.referralCode}
          </Text>
          <Text style={[s.muted, { textAlign: "center", marginTop: 4 }]}>
            Show this QR code to new artisans during field visits to onboard them.
          </Text>
        </View>

        <TouchableOpacity
          style={s.approveBtn}
          onPress={() => Alert.alert("Onboard Scanner", "Camera scanning active for new artisan Aadhaar & GI verification.")}
        >
          <MaterialIcons name="qr-code-scanner" size={18} color="#fff" />
          <Text style={s.approveBtnText}>Scan Artisan QR to Register</Text>
        </TouchableOpacity>
      </View>

      {/* Network Members */}
      <View style={s.card}>
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Registered Network Members</Text>
        {(amb.networkMembers || []).map((m) => (
          <View key={m.id} style={[s.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.borderLight, justifyContent: "space-between" }]}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.textDark }}>{m.name}</Text>
              <Text style={s.muted}>{m.village} • {m.craftsCount} active crafts</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: THEME.colors.primary }}>{m.activeSales}</Text>
              <View style={[s.certPill, { marginTop: 4 }]}>
                <Text style={s.certPillText}>{m.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// 4. Reports & Analytics Screen (Stitch Frame)
// ─────────────────────────────────────────────
export function AmbassadorReportsScreen({ ambassador }) {
  const amb = ambassador || JUNGLE_DATA.ambassador;

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Overview Analytics Card */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Verification & Impact Analytics</Text>
        <Text style={[s.muted, { marginBottom: 14 }]}>
          Real-time field transparency metrics broadcasted to ONDC ledger.
        </Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Total Verified</Text>
            <Text style={[s.statValue, { color: THEME.colors.primary }]}>{amb.verifiedCount}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Earned Honorarium</Text>
            <Text style={[s.statValue, { color: THEME.colors.bark }]}>₹{amb.earnedHonorarium?.toLocaleString()}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Floor Compliance</Text>
            <Text style={[s.statValue, { color: THEME.colors.primary }]}>100%</Text>
          </View>
        </View>
      </View>

      {/* Cluster breakdown */}
      <View style={s.card}>
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Cluster Verification Volumes</Text>

        {[
          { name: "Dokra Bell Metal (Kondagaon)", count: 38, pct: "45%" },
          { name: "Bamboo & Cane (Mandla Hills)", count: 24, pct: "29%" },
          { name: "Terracotta (Gorakhpur)", count: 14, pct: "17%" },
          { name: "Wrought Iron (Bastar Blacksmith)", count: 8, pct: "9%" },
        ].map((item, idx) => (
          <View key={idx} style={{ marginBottom: 14 }}>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 4 }]}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: THEME.colors.textDark }}>{item.name}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: THEME.colors.textDark }}>{item.count} crafts ({item.pct})</Text>
            </View>
            <View style={{ height: 6, backgroundColor: THEME.colors.surfaceWarm, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: item.pct, height: "100%", backgroundColor: THEME.colors.primary }} />
            </View>
          </View>
        ))}
      </View>

      {/* Payout Transparency */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Direct Payout Share Realization</Text>
        <Text style={[s.muted, { marginVertical: 8 }]}>
          Every verified transaction automatically locks 89.2% - 92.4% payout floor into the artisan account with zero middleman deductions.
        </Text>
        <View style={[s.row, { justifyContent: "space-between", marginTop: 8, padding: 12, backgroundColor: THEME.colors.surfaceWarm, borderRadius: THEME.radius.md }]}>
          <Text style={{ fontSize: 12, color: THEME.colors.textDark, fontWeight: "500" }}>Audited Protocol</Text>
          <Text style={{ fontSize: 12, color: THEME.colors.primary, fontWeight: "600" }}>ONDC BECKN v1.2</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Stylesheet
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.surfaceWarm, paddingHorizontal: 16, paddingTop: 16 },

  card: {
    backgroundColor: THEME.colors.surfaceCard, borderRadius: THEME.radius.lg,
    padding: 16, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: 14
  },
  row: { flexDirection: 'row', alignItems: 'center' },

  // Profile
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: THEME.colors.primary },
  pillRow: { flexDirection: 'row', marginBottom: 4 },
  certPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: THEME.radius.full
  },
  certPillText: { fontSize: 11, fontWeight: '500', color: THEME.colors.primary, marginLeft: 4 },
  name: { fontSize: 18, fontWeight: '600', color: THEME.colors.textDark },
  muted: { fontSize: 12, fontWeight: '400', color: THEME.colors.textMuted, marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: THEME.colors.surfaceWarm,
    borderRadius: THEME.radius.md, marginTop: 14, padding: 10
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '500', color: THEME.colors.textMuted },
  statValue: { fontSize: 17, fontWeight: '600', marginTop: 2 },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '600', color: THEME.colors.textDark },
  countBadge: {
    backgroundColor: THEME.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: THEME.radius.full
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // Queue card details
  thumb: { width: 72, height: 72, borderRadius: THEME.radius.md, backgroundColor: THEME.colors.surfaceWarm },
  categoryTag: { fontSize: 11, fontWeight: '500', color: THEME.colors.bark },
  confPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: THEME.radius.full },
  confLow: { backgroundColor: '#FEE2E2' },
  confMed: { backgroundColor: '#FEF3C7' },
  confText: { fontSize: 10, fontWeight: '500', color: THEME.colors.textDark },
  itemTitle: { fontSize: 14, fontWeight: '600', color: THEME.colors.textDark },
  price: { fontSize: 13, fontWeight: '600', color: THEME.colors.primary, marginTop: 3 },

  // Reason
  reasonBox: {
    flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 10,
    borderRadius: THEME.radius.sm, marginTop: 10, marginBottom: 14, alignItems: 'flex-start'
  },
  reasonText: { fontSize: 12, fontWeight: '400', color: THEME.colors.textDark, marginLeft: 8, flex: 1 },

  // Buttons
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceWarm, paddingVertical: 10, borderRadius: THEME.radius.md, gap: 6
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '500', color: THEME.colors.primary },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.colors.primary, paddingVertical: 10, borderRadius: THEME.radius.md, gap: 6
  },
  approveBtnText: { fontSize: 13, fontWeight: '500', color: '#fff' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: THEME.radius.md, gap: 6
  },

  // Checklist
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.colors.borderLight
  },

  // Audio
  audioRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.colors.surfaceWarm, padding: 12, borderRadius: THEME.radius.md
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.colors.bark,
    alignItems: 'center', justifyContent: 'center'
  },

  // Text area
  textArea: {
    backgroundColor: THEME.colors.surfaceWarm, borderRadius: THEME.radius.md,
    padding: 12, fontSize: 13, fontWeight: '400', color: THEME.colors.textDark,
    borderWidth: 1, borderColor: THEME.colors.border, minHeight: 64, textAlignVertical: 'top'
  },
});
