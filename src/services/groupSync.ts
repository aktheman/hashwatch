import axios from 'axios';
import { BASE_URL } from '../api/client';
import { getAuthToken } from '../store/authToken';

export interface GroupData {
  name: string;
  minerIds: string[];
  order: number;
}

export async function syncGroupsToBackend(groups: GroupData[]): Promise<boolean> {
  try {
    const token = getAuthToken();
    if (!token) return false;
    await axios.post(
      `${BASE_URL}/api/groups/sync`,
      { groups },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return true;
  } catch {
    return false;
  }
}

export async function fetchGroupsFromBackend(): Promise<GroupData[]> {
  try {
    const token = getAuthToken();
    if (!token) return [];
    const res = await axios.get(`${BASE_URL}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.groups || [];
  } catch {
    return [];
  }
}
