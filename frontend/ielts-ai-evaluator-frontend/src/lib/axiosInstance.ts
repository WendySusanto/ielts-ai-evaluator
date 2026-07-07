import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071";

const axiosInstance = axios.create({
  baseURL,
});

export default axiosInstance;
