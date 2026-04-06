export const MEDIA_LIMITS = {
  photo: {
    maxSizeBytes:  5  * 1024 * 1024,  // 5 MB
    maxSizeMB:     5,
    maxCount:      5,
    quality:       0.7,
  },
  video: {
    maxSizeBytes:  50 * 1024 * 1024,  // 50 MB
    maxSizeMB:     50,
    maxDurationSec: 60,
  },
  audio: {
    maxSizeBytes:  5  * 1024 * 1024,  // 5 MB
    maxSizeMB:     5,
    maxDurationSec: 30,
  },
  document: {
    maxSizeBytes:  10 * 1024 * 1024,  // 10 MB
    maxSizeMB:     10,
    maxPages:      20,
  },
} as const;
