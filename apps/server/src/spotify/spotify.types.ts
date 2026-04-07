// --- Spotify Web API raw response types ---

export interface SpotifyApiArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

export interface SpotifyApiTrack {
  name: string;
  popularity: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
}

// --- Service return types ---

export interface SpotifySearchResult {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  followers: number;
}

export interface SpotifyArtistDetail {
  name: string;
  imageUrl: string | null;
  description: string | null;
  spotifyId: string;
  spotifyUrl: string;
  monthlyListeners: number | null;
  spotifyMeta: {
    genres: string[];
    popularity: number;
    followers: number;
    images: { url: string; width: number; height: number }[];
    topTracks: {
      name: string;
      previewUrl: string | null;
      popularity: number;
      albumName: string;
      albumImageUrl: string | null;
    }[];
    relatedArtists: {
      name: string;
      spotifyId: string;
      imageUrl: string | null;
      genres: string[];
    }[];
  };
}
