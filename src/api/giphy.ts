import axios from "axios";

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
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
    url: item.images.original.url,
    previewUrl: item.images.fixed_width.url,
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
