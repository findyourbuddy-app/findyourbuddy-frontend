import { apiClient } from "./client";

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export async function fetchIceServers(): Promise<IceServer[]> {
  const response = await apiClient.get<{ ice_servers: IceServer[] }>("/calls/ice-servers");
  return response.data.ice_servers;
}
