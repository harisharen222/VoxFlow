import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({ baseURL, timeout: 60000 });

function extractError(err) {
  if (err?.response?.data?.detail) return err.response.data.detail;
  if (err?.message) return err.message;
  return "Request failed";
}

export const api = {
  baseURL,
  get: async (path, config) => {
    try {
      const { data } = await client.get(path, config);
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },
  post: async (path, body, config) => {
    try {
      const { data } = await client.post(path, body, config);
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },
  delete: async (path, config) => {
    try {
      const { data } = await client.delete(path, config);
      return data;
    } catch (err) {
      throw new Error(extractError(err));
    }
  },
};

export default api;
