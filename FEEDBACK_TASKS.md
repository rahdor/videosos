# Origin Studio - User Feedback Tasks

Based on user feedback collected from 5 Rangers (March 2026).

---

## High Priority

### 1. Timeline Onboarding / Discoverability
**Problem:** Multiple users didn't realize they need to drag content to the timeline. One user felt "frustrated" not knowing what to do after uploading videos.

**User quotes:**
- "I can't figure out what next to do start merging the videos together"
- "It was difficult for me to figure out how to open a video in the editor. It turned out that you just need to drag the video onto the editing timeline."

**Suggested solutions:**
- [ ] Add visual hint/tooltip showing users to drag content to timeline
- [ ] Add empty state on timeline with "Drag content here to start editing" message
- [ ] Consider auto-adding generated content to timeline (or prompting)

---

### 2. Model Selection is Overwhelming
**Problem:** All 5 users chose models randomly or by name recognition. No one understood the differences between models.

**User quotes:**
- "I didn't see any descriptions of the models or the differences between them in the interface"
- "Apart from the pricing I don't know which model is better than which"
- "It would be very helpful to have an automatic model selection option that recommends or chooses the best model based on the user's prompt"

**Suggested solutions:**
- [ ] Add short descriptions for each model (what it's good at)
- [ ] Add tags/badges (e.g., "Fast", "High Quality", "Realistic", "Anime")
- [ ] Consider "Recommended" or "Auto-select" option based on prompt
- [ ] Show example outputs for each model

---

### 3. IPFS Key Requirement Not Clear
**Problem:** Users didn't know IPFS credentials were required for minting until it failed.

**User quote:**
- "There was also an issue with minting — it turns out you need to provide an IPFS API key, otherwise the mint won't go through. It wasn't obvious that this step was mandatory."

**Suggested solutions:**
- [ ] Show clear message before mint if IPFS not configured
- [ ] Add inline prompt in mint flow to configure IPFS
- [ ] Consider providing default IPFS pinning (server-side) for small files

---

## Medium Priority

### 4. Missing Editor Features - Transitions
**Problem:** Users want transitions/effects between clips.

**User quote:**
- "It would be great to see a collection of transitions/effects and similar layers that can be overlaid or used to smoothly splice two videos together"

**Suggested solutions:**
- [ ] Add basic transitions (fade, crossfade, wipe)
- [ ] Transition picker UI between clips on timeline

---

### 5. Missing Editor Features - Audio Volume Control
**Problem:** Users can't adjust audio levels of uploaded content.

**User quote:**
- "I was not able to reduce the volume of the audio in the video I uploaded"

**Suggested solutions:**
- [ ] Add volume slider per clip
- [ ] Add audio waveform visualization
- [ ] Mute button per track

---

### 6. Missing Editor Features - Text Overlays
**Problem:** No way to add text to videos.

**User quote:**
- "There is no option to add text to the video"

**Suggested solutions:**
- [ ] Add text overlay tool
- [ ] Basic text styling (font, size, color, position)
- [ ] Text animation presets

---

### 7. Enhance Prompt Bug - Voice
**Problem:** Enhance prompt for voice changes the entire text unexpectedly.

**User quote:**
- "Enhance prompt for voice changes the entire text to a different text entirely"

**Suggested solutions:**
- [ ] Investigate and fix voice enhance prompt behavior
- [ ] Ensure enhance preserves user's core message

---

## Lower Priority

### 8. Multi-Layer Timeline
**Problem:** Only single timeline track available.

**User quote:**
- "Only a single timeline track is available, with no overlay or multi layer support"

**Suggested solutions:**
- [ ] Add support for multiple video/audio tracks
- [ ] Layer compositing for overlays

---

### 9. Playhead Behavior
**Problem:** Playhead doesn't follow cursor during editing.

**User quote:**
- "The playhead does not move with the cursor, which makes precise editing difficult"

**Suggested solutions:**
- [ ] Improve playhead scrubbing behavior
- [ ] Click-to-seek on timeline

---

### 10. Video Playback Length
**Problem:** Video playback seems limited.

**User quote:**
- "Video playback seems limited to around 6 seconds"

**Suggested solutions:**
- [ ] Investigate playback limitations
- [ ] Ensure full video preview works

---

### 11. Drag and Drop to Timeline
**Problem:** Can't drag files directly onto timeline.

**User quote:**
- "There was no option to drag and drop files directly onto the timeline"

**Suggested solutions:**
- [ ] Enable drag & drop from file system to timeline
- [ ] Enable drag & drop from media panel to timeline

---

## Positive Feedback (Keep Doing)

- **IP Registration valued:** 80% find it moderately-to-highly important
- **Good understanding:** 80% rated 5/5 confidence in understanding blockchain protection
- **All-in-one workflow:** "It's actually a pretty cool feature to be able to generate a video, generate sound for it, and do everything right there in the editor"
- **Willingness to pay:** 40% would pay $5-15/month

---

## Survey Stats

| Metric | Result |
|--------|--------|
| Respondents | 5 |
| Would pay | 40% ($5-15/mo) |
| IP feature importance | 80% moderate-high |
| Blockchain understanding | 80% confident |

---

*Last updated: March 2, 2026*
