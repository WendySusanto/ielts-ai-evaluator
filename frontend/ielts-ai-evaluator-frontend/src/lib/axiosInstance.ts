import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7103/";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

export default axiosInstance;
