import axiosInstance from "./axios";

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);
