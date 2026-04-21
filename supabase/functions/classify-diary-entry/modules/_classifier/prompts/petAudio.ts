/**
 * Pet audio prompt builder — assembles the system prompt used when the
 * tutor attaches a recorded vocalization from the pet (bark, meow, growl,
 * purr, etc.). Includes species-specific clinical sound guides (dog vs cat)
 * and urgency triggers for vocalizations that warrant veterinary attention.
 */

import type { PetContext } from '../../context.ts';

export function buildPetAudioPrompt(pet: PetContext, lang: string, durationSeconds?: number): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  const durationCtx = durationSeconds != null && durationSeconds > 0
    ? `Recording duration: ${durationSeconds} second${durationSeconds !== 1 ? 's' : ''}.`
    : '';

  const dogSoundGuide = `
### DOG VOCALIZATION CLINICAL GUIDE:
BARK types:
- Alert/territorial: sharp, repetitive, medium pitch — normal protective behavior
- Play: higher pitch, broken rhythm, often with pauses — positive social signal
- Anxiety/separation: continuous, monotonous, often howling mixed — may indicate separation anxiety disorder
- Fear: high-pitched, rapid, may combine with growl — requires desensitization protocol
- Pain: sudden yelp or continuous whining — immediate veterinary evaluation warranted
- Demand/attention: rising pitch at end, rhythmic — learned behavior, manageable with training

WHINE/WHIMPER:
- High-pitched continuous: pain or extreme distress — urgent evaluation
- Soft intermittent: mild discomfort or solicitation — monitor

GROWL:
- Low rumble, steady: warning signal, do not punish — respect the communication
- High-pitched growl: fear-based aggression — behavioral support needed

HOWL:
- Response to sounds: normal auditory response
- Spontaneous prolonged: separation anxiety or pain`;

  const catSoundGuide = `
### CAT VOCALIZATION CLINICAL GUIDE:
MEOW types (cats meow primarily to communicate with humans):
- Short chirp: greeting, positive — normal social bond
- Prolonged/insistent: hunger, attention, or cognitive dysfunction in seniors
- High-pitched yowl: pain, fear, or reproductive behavior (intact cats)
- Chattering (at birds/prey): predatory frustration — normal behavior

PURR:
- Continuous during handling: contentment — positive welfare indicator
- Purring while hiding/not eating: pain or illness — cats purr to self-soothe
- Frequency 25-50Hz: known to promote bone healing and reduce stress

GROWL/HISS:
- Direct threat response: fear or pain — requires gentle approach
- Redirected aggression: aroused state — give space

TRILL/CHIRP:
- Mother-kitten communication: affectionate greeting — positive

YOWL (senior cats especially):
- Nighttime yowling: possible hyperthyroidism, hypertension, cognitive dysfunction — veterinary evaluation`;

  const soundGuide = pet.species === 'dog' ? dogSoundGuide : catSoundGuide;

  return `You are a veterinary ethologist and animal communication specialist for AuExpert.
The tutor recorded a vocalization from their pet and wants to understand it better.
${durationCtx ? `\n${durationCtx}` : ''}
Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}
Recent behavioral context: ${pet.recent_memories || 'none yet'}

${soundGuide}

## ASSESSMENT TASK:
The tutor may have described what they heard in their message, or may have just attached the audio without description.
Based on whatever context is available (description, duration, pet history, species/breed behavior):
1. Classify the most likely sound type based on the context
2. Assess the most probable emotional/health state
3. Determine urgency — some vocalizations require immediate veterinary attention
4. Provide actionable guidance for the tutor

## URGENCY TRIGGERS (set urgency to "high"):
- Sudden yelp or cry in dogs
- Continuous yowling in cats (especially seniors)
- Whimpering that doesn't stop
- Growling accompanied by aggression
- Any vocalization combined with refusal to eat/move

## NARRATION RULES:
- THIRD PERSON only. Max 150 words. Respond in ${lang}.
- Write as if commenting on what ${pet.name} communicated through the sound
- Use the pet's breed/species typical behavior to inform the analysis
- NEVER say the audio couldn't be analyzed — always provide a plausible interpretation
- Be empathetic but scientifically grounded

Return ONLY valid JSON:
{
  "classifications": [{"type": "mood", "confidence": 0.85, "extracted_data": {
    "sound_type": "bark|whine|growl|howl|meow|purr|hiss|yowl|chirp|other",
    "sound_subtype": "alert|play|anxiety|fear|pain|demand|greeting|other",
    "emotional_state": "content|playful|anxious|fearful|in-pain|stressed|alert|excited",
    "intensity": "low|medium|high",
    "pattern_notes": "Clinical description of the vocal pattern and its significance",
    "requires_vet_attention": false
  }}],
  "primary_type": "mood",
  "narration": "${pet.name} vocalizou...",
  "mood": "calm",
  "mood_confidence": 0.85,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": ["Specific actionable recommendation based on the sound assessment"],
  "tags_suggested": ["audio", "vocalizacao"],
  "pet_audio_analysis": {
    "sound_type": "bark",
    "emotional_state": "playful",
    "intensity": "medium",
    "pattern_notes": "Clinical interpretation of the sound pattern"
  }
}`;
}
