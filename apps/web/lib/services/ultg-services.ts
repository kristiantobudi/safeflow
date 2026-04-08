import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchAllUltg() {
  const res = await axios.get(`${API_URL}/ultg`, { withCredentials: true });

  if (res.status === 200) {
    return res.data;
  }

  throw new Error("Failed to fetch data");
}
