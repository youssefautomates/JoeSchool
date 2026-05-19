export interface VideoProvider {
  /**
   * Resolves and returns the secure playable URL for a lesson video
   */
  getVideoUrl(lessonId: string, rawVideoUrl: string): string;
}

export class SupabaseVideoProvider implements VideoProvider {
  getVideoUrl(lessonId: string, rawVideoUrl: string): string {
    // Return our secure proxy streaming endpoint URL
    return `/api/video/proxy/${lessonId}`;
  }
}

export class BunnyVideoProvider implements VideoProvider {
  getVideoUrl(lessonId: string, rawVideoUrl: string): string {
    // If it's a Bunny stream URL, we can generate a Bunny Stream Embed URL or signed stream URL.
    // For now, we return Bunny's secure stream embedding format.
    if (rawVideoUrl.includes("bunnycdn.com") || rawVideoUrl.includes("iframe.mediadelivery.net")) {
      return rawVideoUrl;
    }
    // Abstract fallback
    const bunnyLibraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || "";
    const bunnyVideoId = rawVideoUrl.split("/").pop()?.split("?")[0] || "";
    return `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?autoplay=false&preload=true`;
  }
}

/**
 * Factory to retrieve the active enterprise video streaming provider
 */
export function getActiveVideoProvider(): VideoProvider {
  const providerType = process.env.NEXT_PUBLIC_VIDEO_PROVIDER || "supabase";
  
  if (providerType === "bunny") {
    return new BunnyVideoProvider();
  }
  
  // Default is our secure Supabase Proxy Stream Provider
  return new SupabaseVideoProvider();
}
