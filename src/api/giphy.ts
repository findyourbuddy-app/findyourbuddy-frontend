import axios from "axios";

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY || "glDed0O4pT1khDsy2yO44bMthFos41qW";
const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

interface GiphyImageVariant {
  url: string;
}

interface GiphyGifItem {
  id: string;
  title: string;
  images: {
    fixed_width: GiphyImageVariant;
    fixed_width_downsampled?: GiphyImageVariant;
    downsized?: GiphyImageVariant;
    original: GiphyImageVariant;
  };
}

interface GiphyListResponse {
  data: GiphyGifItem[];
}

function mapGif(item: GiphyGifItem): GifResult {
  return {
    id: item.id,
    title: item.title,
    // `downsized` is capped at ~2 MB -- reliable to send over mobile data,
    // unlike `original` which can be 10 MB+.
    url: item.images.downsized?.url ?? item.images.original.url,
    // Downsampled preview is a fraction of the size -- much lighter to decode
    // and animate in a scrolling grid.
    previewUrl: item.images.fixed_width_downsampled?.url ?? item.images.fixed_width.url,
  };
}

export async function fetchTrendingGifs(limit = 24): Promise<GifResult[]> {
  const res = await axios.get<GiphyListResponse>(`${GIPHY_BASE_URL}/trending`, {
    params: { api_key: GIPHY_API_KEY, limit, rating: "pg-13" },
  });
  return res.data.data.map(mapGif);
}

export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  const res = await axios.get<GiphyListResponse>(`${GIPHY_BASE_URL}/search`, {
    params: { api_key: GIPHY_API_KEY, q: query, limit, rating: "pg-13" },
  });
  return res.data.data.map(mapGif);
}
